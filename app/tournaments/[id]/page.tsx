'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { ArrowLeft, Trophy, Calendar, MapPin, Users } from '@/components/Icons'
import { format, parseISO } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

type Sport = { id: string; slug: string; name: string; icon: string | null }
type Division = {
  id: string
  name: string
  skill_level_min: number | null
  skill_level_max: number | null
  max_participants: number | null
  registration_count: number
}
type TournamentDetail = {
  id: string
  name: string
  description: string | null
  sport_id: string
  organizer_id: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string
  ends_at: string | null
  status: string
  bracket_type: string
  team_size: number
  groups_count: number | null
  max_participants: number | null
  location: string | null
  sport: Sport | null
  divisions: Division[]
  my_registration: { id: string; division_id: string; status: string; team_id: string | null } | null
  is_organizer: boolean
}

type GroupMatch = {
  id: string
  status: string
  result_type: string | null
  scheduled_at: string | null
  team1_id: string | null
  team2_id: string | null
  winner_team_id: string | null
  team1_name: string | null
  team2_name: string | null
  winner_name: string | null
  team1_score: number | null
  team2_score: number | null
  games_won_1: number | null
  games_won_2: number | null
}

type GroupStandingRow = {
  id: string
  team_id: string | null
  name: string
  wins: number
  losses: number
  played: number
  games_differential: number
}

type GroupData = {
  id: string
  name: string
  division_id: string
  display_order: number
  matches: GroupMatch[]
  standings: GroupStandingRow[]
}

type KnockoutMatch = {
  id: string
  round: number
  match_order: number
  status: string
  result_type: string | null
  scheduled_at: string | null
  team1_id: string | null
  team2_id: string | null
  winner_team_id: string | null
  team1_name: string | null
  team2_name: string | null
  winner_name: string | null
  team1_score: number | null
  team2_score: number | null
  player1_registration_id: string | null
  player2_registration_id: string | null
  player1_name: string | null
  player2_name: string | null
  player1_score: number | null
  player2_score: number | null
}

type KnockoutRound = { label: string; matches: KnockoutMatch[] }
type KnockoutBracket = {
  bracket_id: string
  division_id: string
  division_name: string
  rounds: Record<number, KnockoutRound>
}

type BracketData = {
  division_id?: string
  groups: GroupData[]
  bracket?: KnockoutBracket | null
  brackets?: KnockoutBracket[]
}

type UserSearchResult = { id: string; name: string | null; image: string | null }

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-stone-soft/80 text-stone border border-stone-soft',
    registration_open: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
    registration_closed: 'bg-terracotta/10 text-terracotta border border-terracotta/25',
    live: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
    completed: 'bg-stone-soft/80 text-stone border border-stone-soft',
  }
  const label: Record<string, string> = {
    draft: 'Draft',
    registration_open: 'Registration open',
    registration_closed: 'Registration closed',
    live: 'Live',
    completed: 'Completed',
  }
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  )
}

function ResultTypeBadge({ type }: { type: string | null }) {
  if (!type || type === 'normal') return null
  const labels: Record<string, string> = { walkover: 'WO', default: 'DEF', dq: 'DQ' }
  return (
    <span className="px-1.5 py-0.5 bg-stone-soft text-stone text-xs rounded font-medium">
      {labels[type] ?? type.toUpperCase()}
    </span>
  )
}

function ScoreDisplay({ match, isTeamBased }: { match: GroupMatch | KnockoutMatch; isTeamBased: boolean }) {
  if (match.status === 'completed') {
    const s1 = isTeamBased ? (match as any).team1_score : (match as any).player1_score
    const s2 = isTeamBased ? (match as any).team2_score : (match as any).player2_score
    if (s1 !== null && s2 !== null) {
      return <span className="font-semibold text-ink tabular-nums">{s1}–{s2}</span>
    }
    return <ResultTypeBadge type={match.result_type} />
  }
  if (match.status === 'bye') return <span className="text-stone text-xs">BYE</span>
  return null
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  isOrganizer,
  onSubmitResult,
}: {
  group: GroupData
  isOrganizer: boolean
  onSubmitResult: (match: GroupMatch) => void
}) {
  const [tab, setTab] = useState<'matches' | 'standings'>('matches')

  return (
    <div className="bg-white rounded-2xl border border-stone-soft shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-lg text-ink">Group {group.name}</h3>
        <div className="flex bg-beige rounded-xl p-1 gap-1">
          {(['matches', 'standings'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-white shadow-sm text-ink' : 'text-stone hover:text-ink'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        {tab === 'matches' ? (
          <div className="space-y-2">
            {group.matches.length === 0 ? (
              <p className="text-stone text-sm py-3">No matches scheduled.</p>
            ) : (
              group.matches.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    m.status === 'completed'
                      ? 'border-stone-soft bg-beige/30'
                      : 'border-stone-soft bg-white'
                  }`}
                >
                  {m.scheduled_at && (
                    <span className="text-xs text-stone w-14 shrink-0 hidden sm:block">
                      {format(parseISO(m.scheduled_at), 'MMM d')}
                    </span>
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <p className={`text-sm truncate ${m.winner_team_id === m.team1_id ? 'font-semibold text-ink' : 'text-stone'}`}>
                      {m.team1_name ?? 'TBD'}
                    </p>
                    <div className="flex items-center gap-1.5 justify-center">
                      {m.status === 'completed' ? (
                        <>
                          <ScoreDisplay match={m} isTeamBased={true} />
                          <ResultTypeBadge type={m.result_type} />
                        </>
                      ) : (
                        <span className="text-stone text-xs font-medium">vs</span>
                      )}
                    </div>
                    <p className={`text-sm truncate text-right ${m.winner_team_id === m.team2_id ? 'font-semibold text-ink' : 'text-stone'}`}>
                      {m.team2_name ?? 'TBD'}
                    </p>
                  </div>
                  {isOrganizer && m.status === 'pending' && m.team1_id && m.team2_id && (
                    <button
                      type="button"
                      onClick={() => onSubmitResult(m)}
                      className="shrink-0 px-3 py-1.5 text-terracotta border border-terracotta/30 rounded-lg text-xs font-medium hover:bg-terracotta/5 transition-colors"
                    >
                      Score
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-soft">
                  <th className="text-left py-2.5 text-xs font-medium text-stone uppercase tracking-wide w-7">#</th>
                  <th className="text-left py-2.5 text-xs font-medium text-stone uppercase tracking-wide">Player / Pair</th>
                  <th className="text-right py-2.5 text-xs font-medium text-stone uppercase tracking-wide w-9">W</th>
                  <th className="text-right py-2.5 text-xs font-medium text-stone uppercase tracking-wide w-9">L</th>
                  <th className="text-right py-2.5 text-xs font-medium text-stone uppercase tracking-wide w-12">G</th>
                </tr>
              </thead>
              <tbody>
                {group.standings.map((row, i) => (
                  <tr key={row.id} className="border-b border-stone-soft/40 last:border-0">
                    <td className="py-3 text-stone text-sm">{i + 1}</td>
                    <td className="py-3 font-medium text-ink">{row.name}</td>
                    <td className="py-3 text-right text-ink tabular-nums">{row.wins}</td>
                    <td className="py-3 text-right text-stone tabular-nums">{row.losses}</td>
                    <td className={`py-3 text-right tabular-nums font-medium ${row.games_differential > 0 ? 'text-accent-green' : row.games_differential < 0 ? 'text-terracotta' : 'text-stone'}`}>
                      {row.games_differential > 0 ? `+${row.games_differential}` : row.games_differential}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-stone mt-3">W: Wins · L: Losses · G: Games +/-</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Knockout Bracket ─────────────────────────────────────────────────────────

function KnockoutBracketView({
  bracket,
  isOrganizer,
  onSubmitResult,
}: {
  bracket: KnockoutBracket
  isOrganizer: boolean
  onSubmitResult: (match: KnockoutMatch) => void
}) {
  const rounds = Object.entries(bracket.rounds)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  if (rounds.length === 0) return null

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {rounds.map(([roundNum, round]) => (
          <div key={roundNum} className="flex flex-col gap-3" style={{ minWidth: 200 }}>
            <p className="text-xs font-medium text-stone uppercase tracking-wide text-center px-2">
              {round.label}
            </p>
            <div className="flex flex-col gap-3">
              {round.matches.map((m) => {
                const isTeamBased = !!(m.team1_id || m.team2_id)
                const p1Name = isTeamBased ? m.team1_name : m.player1_name
                const p2Name = isTeamBased ? m.team2_name : m.player2_name
                const winnerId = isTeamBased ? m.winner_team_id : m.player1_registration_id && m.winner_name ? m.winner_team_id : null
                const p1IsWinner = isTeamBased
                  ? m.winner_team_id === m.team1_id
                  : m.player1_score !== null && m.player2_score !== null && (m.player1_score > m.player2_score)
                const p2IsWinner = isTeamBased
                  ? m.winner_team_id === m.team2_id
                  : m.player1_score !== null && m.player2_score !== null && (m.player2_score > m.player1_score)

                return (
                  <div key={m.id} className="border border-stone-soft rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Player 1 / Team 1 */}
                    <div className={`flex items-center gap-2 px-3 py-2 border-b border-stone-soft/60 ${p1IsWinner ? 'border-l-2 border-l-terracotta' : ''}`}>
                      <span className={`flex-1 text-sm truncate ${p1IsWinner ? 'font-semibold text-ink' : 'text-stone'}`}>
                        {p1Name ?? (
                          <span className="inline-block bg-beige text-stone text-xs px-2 py-0.5 rounded-md font-normal">TBD</span>
                        )}
                      </span>
                      {m.status === 'completed' && (
                        <span className="text-xs tabular-nums font-semibold text-ink ml-auto">
                          {isTeamBased ? (m.team1_score ?? '') : (m.player1_score ?? '')}
                        </span>
                      )}
                    </div>
                    {/* Player 2 / Team 2 */}
                    <div className={`flex items-center gap-2 px-3 py-2 ${p2IsWinner ? 'border-l-2 border-l-terracotta' : ''}`}>
                      <span className={`flex-1 text-sm truncate ${p2IsWinner ? 'font-semibold text-ink' : 'text-stone'}`}>
                        {p2Name ?? (
                          <span className="inline-block bg-beige text-stone text-xs px-2 py-0.5 rounded-md font-normal">TBD</span>
                        )}
                      </span>
                      {m.status === 'completed' && (
                        <span className="text-xs tabular-nums font-semibold text-ink ml-auto">
                          {isTeamBased ? (m.team2_score ?? '') : (m.player2_score ?? '')}
                        </span>
                      )}
                    </div>
                    {/* Organizer submit + result type */}
                    {(m.result_type && m.result_type !== 'normal') || (isOrganizer && m.status === 'pending' && (m.team1_id || m.player1_registration_id) && (m.team2_id || m.player2_registration_id)) ? (
                      <div className="px-3 py-1.5 bg-beige/50 flex items-center justify-between border-t border-stone-soft/40">
                        <ResultTypeBadge type={m.result_type} />
                        {isOrganizer && m.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => onSubmitResult(m)}
                            className="text-xs text-terracotta font-medium hover:underline"
                          >
                            Submit score
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

type ResultModalData = {
  matchId: string
  isTeamBased: boolean
  team1Id: string | null
  team2Id: string | null
  team1Name: string
  team2Name: string
  p1RegId: string | null
  p2RegId: string | null
}

function ResultModal({
  data,
  onClose,
  onSubmit,
  submitting,
}: {
  data: ResultModalData
  onClose: () => void
  onSubmit: (form: any) => void
  submitting: boolean
}) {
  const [form, setForm] = useState({
    score1: '',
    score2: '',
    winnerId: '',
    resultType: 'normal' as 'normal' | 'walkover' | 'default' | 'dq',
  })

  const options = data.isTeamBased
    ? [
        { id: data.team1Id ?? '', label: data.team1Name },
        { id: data.team2Id ?? '', label: data.team2Name },
      ]
    : [
        { id: data.p1RegId ?? '', label: data.team1Name },
        { id: data.p2RegId ?? '', label: data.team2Name },
      ]

  const handleSubmit = () => {
    onSubmit({
      winner_team_id: data.isTeamBased ? form.winnerId : undefined,
      winner_registration_id: !data.isTeamBased ? form.winnerId : undefined,
      team1_score: form.score1 ? parseInt(form.score1, 10) : undefined,
      team2_score: form.score2 ? parseInt(form.score2, 10) : undefined,
      player1_score: !data.isTeamBased && form.score1 ? parseInt(form.score1, 10) : undefined,
      player2_score: !data.isTeamBased && form.score2 ? parseInt(form.score2, 10) : undefined,
      result_type: form.resultType,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-soft shadow-xl max-w-sm w-full p-6">
        <h2 className="text-xl font-display text-ink mb-1">Submit score</h2>
        <p className="text-stone text-sm mb-5">{data.team1Name} vs {data.team2Name}</p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-stone mb-2">Result type</label>
          <div className="flex gap-2 flex-wrap">
            {(['normal', 'walkover', 'default', 'dq'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, resultType: t }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.resultType === t
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-stone border-stone-soft hover:border-stone'
                }`}
              >
                {t === 'normal' ? 'Normal' : t === 'walkover' ? 'Walkover' : t === 'dq' ? 'DQ' : 'Default'}
              </button>
            ))}
          </div>
        </div>

        {form.resultType === 'normal' && (
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone mb-1">{data.team1Name} score</label>
              <input
                type="number"
                min={0}
                value={form.score1}
                onChange={(e) => setForm((f) => ({ ...f, score1: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-soft rounded-xl text-ink text-sm"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone mb-1">{data.team2Name} score</label>
              <input
                type="number"
                min={0}
                value={form.score2}
                onChange={(e) => setForm((f) => ({ ...f, score2: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-soft rounded-xl text-ink text-sm"
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-stone mb-2">Winner</label>
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, winnerId: opt.id }))}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                  form.winnerId === opt.id
                    ? 'border-terracotta bg-terracotta/5 text-terracotta'
                    : 'border-stone-soft bg-white text-stone hover:border-stone'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.winnerId}
            className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [bracketData, setBracketData] = useState<BracketData | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'group_stage' | 'bracket'>('info')

  // Registration
  const [registering, setRegistering] = useState(false)
  const [regDivision, setRegDivision] = useState('')
  const [partnerQuery, setPartnerQuery] = useState('')
  const [partnerResults, setPartnerResults] = useState<UserSearchResult[]>([])
  const [selectedPartner, setSelectedPartner] = useState<UserSearchResult | null>(null)
  const [partnerSearching, setPartnerSearching] = useState(false)

  // Organizer actions
  const [organizerAction, setOrganizerAction] = useState<string | null>(null)

  // Result modal
  const [resultModal, setResultModal] = useState<ResultModalData | null>(null)
  const [submittingResult, setSubmittingResult] = useState(false)

  const fetchTournament = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/tournaments/${id}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Tournament not found' : 'Failed to load')
        setTournament(null)
        return
      }
      const data = await res.json()
      setTournament(data)
      if (data.divisions?.length && !regDivision) setRegDivision(data.divisions[0].id)
      if (data.divisions?.length && !selectedDivision) setSelectedDivision(data.divisions[0].id)
    } catch {
      setError('Failed to load')
    }
  }, [id])

  const fetchBracket = useCallback(
    async (divId?: string) => {
      const url = divId
        ? `/api/tournaments/${id}/bracket?division_id=${divId}`
        : `/api/tournaments/${id}/bracket`
      const res = await fetch(url)
      if (res.ok) {
        setBracketData(await res.json())
      } else {
        setBracketData(null)
      }
    },
    [id]
  )

  // Load tournament and bracket in parallel for faster first paint
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError('')
    const run = async () => {
      const [tournamentRes, bracketRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/bracket`),
      ])
      if (cancelled) return
      if (!tournamentRes.ok) {
        setError(tournamentRes.status === 404 ? 'Tournament not found' : 'Failed to load')
        setTournament(null)
        setLoading(false)
        return
      }
      const tournamentData = await tournamentRes.json()
      setTournament(tournamentData)
      if (tournamentData.divisions?.length) {
        setRegDivision(tournamentData.divisions[0].id)
        setSelectedDivision(tournamentData.divisions[0].id)
      }
      if (bracketRes.ok) {
        setBracketData(await bracketRes.json())
      } else {
        setBracketData(null)
      }
      setLoading(false)
    }
    run().catch(() => {
      if (!cancelled) {
        setError('Failed to load')
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  // Partner search
  useEffect(() => {
    if (!partnerQuery || partnerQuery.length < 2) {
      setPartnerResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setPartnerSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(partnerQuery)}`)
        if (res.ok) setPartnerResults(await res.json())
      } finally {
        setPartnerSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [partnerQuery])

  const handleRegister = async () => {
    if (!regDivision) return
    const isDoubles = tournament?.team_size === 2
    if (isDoubles && !selectedPartner) {
      alert('Please select a partner for doubles registration.')
      return
    }
    setRegistering(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division_id: regDivision,
          partner_user_id: isDoubles ? selectedPartner?.id : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to register')
        return
      }
      setSelectedPartner(null)
      setPartnerQuery('')
      await fetchTournament()
    } finally {
      setRegistering(false)
    }
  }

  const handleUnregister = async () => {
    if (!confirm('Unregister from this tournament?')) return
    try {
      const res = await fetch(`/api/tournaments/${id}/unregister`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to unregister')
        return
      }
      router.push('/tournaments')
    } catch {
      alert('Failed to unregister')
    }
  }

  const handleOrganizerAction = async (action: string) => {
    setOrganizerAction(action)
    try {
      let res: Response
      if (action === 'open') {
        res = await fetch(`/api/tournaments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'registration_open' }),
        })
      } else if (action === 'close') {
        res = await fetch(`/api/tournaments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'registration_closed' }),
        })
      } else if (action === 'generate_groups') {
        res = await fetch(`/api/tournaments/${id}/generate-groups`, { method: 'POST' })
      } else if (action === 'generate_knockout') {
        res = await fetch(`/api/tournaments/${id}/generate-knockout`, { method: 'POST' })
      } else if (action === 'generate_bracket') {
        res = await fetch(`/api/tournaments/${id}/generate-bracket`, { method: 'POST' })
      } else {
        return
      }

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Action failed')
        return
      }

      await fetchTournament()
      await fetchBracket(selectedDivision)
    } catch (e: any) {
      alert(e.message ?? 'Action failed')
    } finally {
      setOrganizerAction(null)
    }
  }

  const handleSubmitResult = async (form: any) => {
    if (!resultModal) return
    setSubmittingResult(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/matches/${resultModal.matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to submit')
      }
      setResultModal(null)
      await fetchBracket(selectedDivision)
    } catch (e: any) {
      alert(e.message ?? 'Failed to submit result')
    } finally {
      setSubmittingResult(false)
    }
  }

  const openResultModal = (match: GroupMatch | KnockoutMatch) => {
    const isTeamBased = !!(
      (match as GroupMatch).team1_id || (match as KnockoutMatch).team1_id
    )
    setResultModal({
      matchId: match.id,
      isTeamBased,
      team1Id: (match as any).team1_id ?? null,
      team2Id: (match as any).team2_id ?? null,
      team1Name: (match as any).team1_name ?? (match as any).player1_name ?? 'Player 1',
      team2Name: (match as any).team2_name ?? (match as any).player2_name ?? 'Player 2',
      p1RegId: (match as any).player1_registration_id ?? null,
      p2RegId: (match as any).player2_registration_id ?? null,
    })
  }

  // Derived state (support both single-division and all-divisions bracket response)
  const isGroupKnockout = tournament?.bracket_type === 'group_knockout'
  const currentGroups = bracketData?.groups?.filter((g) => !selectedDivision || g.division_id === selectedDivision) ?? []
  const currentBracket =
    bracketData?.bracket ??
    bracketData?.brackets?.find((b) => b.division_id === selectedDivision) ??
    null
  const hasGroups = currentGroups.length > 0
  const hasKnockout = currentBracket != null && Object.keys(currentBracket.rounds ?? {}).length > 0

  // Count pending group matches for current division
  const pendingGroupMatches = currentGroups.flatMap((g) => g.matches).filter((m) => m.status === 'pending').length

  // Available tabs
  const tabs: { id: 'info' | 'group_stage' | 'bracket'; label: string }[] = [
    { id: 'info', label: 'Divisions' },
    ...(hasGroups ? [{ id: 'group_stage' as const, label: 'Group Stage' }] : []),
    ...(hasKnockout ? [{ id: 'bracket' as const, label: 'Bracket' }] : []),
  ]

  if (loading && !tournament) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-beige">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-stone-soft/80 rounded w-48" />
              <div className="bg-white rounded-2xl border border-stone-soft p-6 space-y-4">
                <div className="h-10 bg-stone-soft/80 rounded w-1/3" />
                <div className="h-4 bg-stone-soft/80 rounded w-full" />
                <div className="h-4 bg-stone-soft/80 rounded w-2/3" />
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !tournament) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-beige">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-800 font-medium">{error || 'Tournament not found'}</p>
              <Link href="/tournaments" className="inline-block mt-4 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium">
                Back to tournaments
              </Link>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const canRegister = tournament.status === 'registration_open' && !tournament.my_registration
  const isDoubles = tournament.team_size === 2

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-stone hover:text-terracotta transition-colors text-sm font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to tournaments
          </Link>

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 md:p-8 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{tournament.sport?.icon ?? '🎾'}</span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display text-ink">{tournament.name}</h1>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <StatusBadge status={tournament.status} />
                    {tournament.my_registration && (
                      <span className="px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-lg text-xs font-medium border border-terracotta/25">
                        Registered
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-stone-soft/60 text-stone rounded-lg text-xs font-medium">
                      {isGroupKnockout ? 'Group + Knockout' : tournament.bracket_type.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2.5 py-1 bg-stone-soft/60 text-stone rounded-lg text-xs font-medium">
                      {isDoubles ? 'Doubles' : 'Singles'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {tournament.description && (
              <p className="text-stone mt-4">{tournament.description}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(parseISO(tournament.starts_at), 'MMM d, yyyy')}
              </span>
              {tournament.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {tournament.location}
                </span>
              )}
            </div>

            {/* Organizer progressive actions */}
            {tournament.is_organizer && (
              <div className="mt-6 pt-6 border-t border-stone-soft flex flex-wrap gap-2 items-center">
                {tournament.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleOrganizerAction('open')}
                    disabled={!!organizerAction}
                    className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {organizerAction === 'open' ? 'Opening…' : 'Open registration'}
                  </button>
                )}
                {tournament.status === 'registration_open' && (
                  <button
                    type="button"
                    onClick={() => handleOrganizerAction('close')}
                    disabled={!!organizerAction}
                    className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium disabled:opacity-70"
                  >
                    {organizerAction === 'close' ? 'Closing…' : 'Close registration'}
                  </button>
                )}
                {tournament.status === 'registration_closed' && isGroupKnockout && !hasGroups && (
                  <button
                    type="button"
                    onClick={() => handleOrganizerAction('generate_groups')}
                    disabled={!!organizerAction}
                    className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {organizerAction === 'generate_groups' ? 'Setting up…' : 'Set up groups & start'}
                  </button>
                )}
                {tournament.status === 'registration_closed' && !isGroupKnockout && !hasKnockout && (
                  <button
                    type="button"
                    onClick={() => handleOrganizerAction('generate_bracket')}
                    disabled={!!organizerAction}
                    className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {organizerAction === 'generate_bracket' ? 'Generating…' : 'Generate bracket & start'}
                  </button>
                )}
                {tournament.status === 'live' && isGroupKnockout && hasGroups && !hasKnockout && (
                  pendingGroupMatches > 0 ? (
                    <span className="text-sm text-stone">
                      {pendingGroupMatches} group match{pendingGroupMatches !== 1 ? 'es' : ''} remaining before knockout
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOrganizerAction('generate_knockout')}
                      disabled={!!organizerAction}
                      className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                    >
                      {organizerAction === 'generate_knockout' ? 'Generating…' : 'Start knockout phase'}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Registration form */}
            {canRegister && (
              <div className="mt-6 pt-6 border-t border-stone-soft">
                <p className="text-sm font-bold text-ink mb-3">Register{isDoubles ? ' as a pair' : ''}</p>
                <div className="flex flex-wrap gap-3 items-start">
                  {tournament.divisions.length > 1 && (
                    <select
                      value={regDivision}
                      onChange={(e) => setRegDivision(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm"
                    >
                      {tournament.divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.registration_count}{d.max_participants ? ` / ${d.max_participants}` : ''})
                        </option>
                      ))}
                    </select>
                  )}

                  {isDoubles && (
                    <div className="relative flex-1 min-w-[220px]">
                      {selectedPartner ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-terracotta/40 bg-terracotta/5">
                          <span className="text-sm font-medium text-ink flex-1">{selectedPartner.name}</span>
                          <button
                            type="button"
                            onClick={() => { setSelectedPartner(null); setPartnerQuery('') }}
                            className="text-stone hover:text-terracotta text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={partnerQuery}
                            onChange={(e) => setPartnerQuery(e.target.value)}
                            placeholder="Search partner by name…"
                            className="w-full px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm"
                          />
                          {partnerQuery.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-soft rounded-xl shadow-lg z-20 overflow-hidden">
                              {partnerSearching ? (
                                <div className="px-4 py-3 text-stone text-sm">Searching…</div>
                              ) : partnerResults.length === 0 ? (
                                <div className="px-4 py-3 text-stone text-sm">No players found</div>
                              ) : (
                                partnerResults.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => { setSelectedPartner(u); setPartnerQuery(''); setPartnerResults([]) }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-beige text-left transition-colors"
                                  >
                                    {u.image ? (
                                      <img src={u.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-stone-soft flex items-center justify-center text-xs font-medium text-stone">
                                        {(u.name ?? '?').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-ink text-sm font-medium">{u.name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering || (isDoubles && !selectedPartner)}
                    className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {registering ? 'Registering…' : 'Register'}
                  </button>
                </div>
              </div>
            )}

            {tournament.my_registration && (tournament.status === 'registration_open' || tournament.status === 'registration_closed') && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleUnregister}
                  className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
                >
                  Unregister
                </button>
              </div>
            )}
          </div>

          {/* Division pills (if multiple divisions) */}
          {tournament.divisions.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tournament.divisions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDivision(d.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    selectedDivision === d.id
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-stone border-stone-soft hover:border-terracotta/40'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          {tabs.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t.id
                      ? 'bg-ink text-white'
                      : 'bg-white border border-stone-soft text-stone hover:bg-beige'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Divisions tab */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
              <h2 className="text-lg font-display text-ink mb-4">Divisions</h2>
              <div className="space-y-3">
                {tournament.divisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-4 bg-beige rounded-xl">
                    <span className="font-medium text-ink">{d.name}</span>
                    <span className="text-stone text-sm flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {d.registration_count}{d.max_participants ? ` / ${d.max_participants}` : ''} registered
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group stage tab */}
          {activeTab === 'group_stage' && bracketData && (
            <div className="space-y-4">
              {currentGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isOrganizer={tournament.is_organizer}
                    onSubmitResult={openResultModal}
                  />
                ))}
            </div>
          )}

          {/* Knockout bracket tab */}
          {activeTab === 'bracket' && currentBracket && (
            <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-5 md:p-6">
              <h2 className="text-lg font-display text-ink mb-5">
                {currentBracket.division_name} — Knockout
              </h2>
              <KnockoutBracketView
                bracket={currentBracket}
                isOrganizer={tournament.is_organizer}
                onSubmitResult={openResultModal}
              />
            </div>
          )}

          {/* Fallback: no data yet */}
          {!hasGroups && !hasKnockout && tournament.status === 'live' && (
            <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-8 text-center">
              <Trophy className="w-12 h-12 text-stone mx-auto mb-3" />
              <p className="font-display text-ink text-lg mb-1">Tournament is live</p>
              <p className="text-stone text-sm">Check back once the bracket is generated.</p>
            </div>
          )}
        </main>
      </div>

      {resultModal && (
        <ResultModal
          data={resultModal}
          onClose={() => setResultModal(null)}
          onSubmit={handleSubmitResult}
          submitting={submittingResult}
        />
      )}
    </ProtectedRoute>
  )
}
