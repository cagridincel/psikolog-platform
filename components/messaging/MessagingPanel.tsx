'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = {
  navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC',
  muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9',
  surface: '#FFFFFF', danger: '#B91C1C',
}

interface Participant { id: string; full_name: string; avatar_url: string | null; role: string }
interface LastMessage { content: string | null; file_name: string | null; created_at: string }
interface Conversation {
  id: string
  participants: Participant[]
  last_message: LastMessage | null
  unread_count: number
  last_message_at: string | null
}
interface Message {
  id: string
  sender_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}
interface Client { id: string; full_name: string; avatar_url: string | null }

function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  if (src) return <img src={src} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} alt="" />
  return (
    <div className="rounded-full flex items-center justify-center font-medium flex-shrink-0"
      style={{ width: size, height: size, background: C.blueTint, color: C.blue, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function FilePreview({ url, name, type }: { url: string; name: string; type: string | null }) {
  const isImage = type?.startsWith('image/')
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl overflow-hidden border max-w-xs"
      style={{ borderColor: C.border, background: '#FAFBFD', textDecoration: 'none' }}>
      {isImage ? (
        <img src={url} alt={name} className="max-w-full max-h-48 object-cover rounded-xl" />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="text-sm truncate max-w-40" style={{ color: C.navy }}>{name}</span>
        </div>
      )}
    </a>
  )
}

interface Props {
  currentUserId: string
  currentUserName: string
  role?: 'psychologist' | 'client' | 'admin'
  // Danışan için otomatik psikolog ID
  defaultRecipientId?: string
}

export default function MessagingPanel({ currentUserId, currentUserName: _currentUserName, role, defaultRecipientId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  // Yeni konuşma modal
  const [showNewConv, setShowNewConv] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [startingConv, setStartingConv] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    const res = await fetch('/api/conversations')
    const data = await res.json()
    const list: Conversation[] = data ?? []
    setConversations(list)
    setLoadingConvs(false)
    return list
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    const res = await fetch(`/api/conversations/${convId}/messages`)
    const data = await res.json()
    setMessages(data ?? [])
    setLoadingMsgs(false)
  }, [])

  // Danışan için — psikologuyla konuşmayı otomatik başlat/bul
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (role !== 'client' || !defaultRecipientId) return
    fetchConversations().then(list => {
      const existing = list.find(c =>
        c.participants.some(p => p.id === defaultRecipientId)
      )
      if (existing) {
        setActiveConvId(existing.id)
      } else {
        startConversation(defaultRecipientId)
      }
    })
  }, [role, defaultRecipientId])

  useEffect(() => {
    // Danışan değilse normal fetch
    if (role !== 'client') fetchConversations()
  }, [fetchConversations, role])

  useEffect(() => {
    if (!activeConvId) return
    fetchMessages(activeConvId)

    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => [...prev, newMsg])
        if (newMsg.sender_id !== currentUserId) {
          fetch(`/api/conversations/${activeConvId}/messages`)
        }
        fetchConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvId, currentUserId, fetchMessages, fetchConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startConversation(recipientId: string) {
    setStartingConv(true)
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    })
    const data = await res.json()
    if (data.id) {
      await fetchConversations()
      setActiveConvId(data.id)
      setShowNewConv(false)
    }
    setStartingConv(false)
  }

  async function loadClients() {
    setLoadingClients(true)
    // Admin tüm kullanıcıları, psikolog kendi danışanlarını listeler
    const endpoint = role === 'admin'
      ? '/api/admin/users?page=0'
      : '/api/psychologist/clients'
    const res = await fetch(endpoint)
    const data = await res.json()
    // admin/users { data: [...] }, psychologist/clients direkt array döner
    const list = Array.isArray(data) ? data : (data.data ?? [])
    setClients(list)
    setLoadingClients(false)
  }

  async function sendMessage() {
    if (!activeConvId || !input.trim()) return
    setSending(true)
    await fetch(`/api/conversations/${activeConvId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    })
    setInput('')
    setSending(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeConvId) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/messages/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: data.url, file_name: data.name, file_type: data.type }),
      })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex h-full rounded-2xl border overflow-hidden" style={{ borderColor: C.border, minHeight: 500 }}>

      {/* Danışan seçim modal — psikolog için */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(29,53,87,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowNewConv(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <p className="text-sm font-medium" style={{ color: C.navy }}>Yeni Mesaj</p>
              <button onClick={() => setShowNewConv(false)} style={{ color: C.muted, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {loadingClients ? (
                <p className="text-sm text-center py-8" style={{ color: C.muted }}>Yükleniyor...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: C.muted }}>Henüz danışanınız yok.</p>
              ) : clients.map(c => (
                <button key={c.id} onClick={() => startConversation(c.id)}
                  disabled={startingConv}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: C.border }}>
                  <Avatar name={c.full_name} src={c.avatar_url} size={36} />
                  <span className="text-sm font-medium" style={{ color: C.navy }}>{c.full_name}</span>
                  {startingConv && <div className="ml-auto w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sol: Konuşma listesi */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 260, borderRight: `0.5px solid ${C.border}`, background: C.surface }}>
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
          <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>MESAJLAR</p>
          {/* Yeni konuşma — sadece psikolog ve admin için */}
          {(role === 'psychologist' || role === 'admin') && (
            <button
              onClick={() => { setShowNewConv(true); loadClients() }}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: C.blueTint, color: C.blue }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Yeni
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-8 text-center text-sm" style={{ color: C.muted }}>Yükleniyor...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: C.muted }}>
                {role === 'client' ? 'Psikologunuzla konuşma başlatılıyor...' : 'Henüz konuşma yok.'}
              </p>
            </div>
          ) : conversations.map(conv => {
            const other = conv.participants[0]
            const isActive = conv.id === activeConvId
            return (
              <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b"
                style={{ background: isActive ? C.blueTint : 'transparent', borderColor: C.border }}>
                <div className="relative flex-shrink-0">
                  <Avatar name={other?.full_name ?? '?'} src={other?.avatar_url} size={38} />
                  {(conv.unread_count ?? 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
                      style={{ background: C.blue, fontSize: 9, fontWeight: 700 }}>
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate" style={{ color: C.navy }}>{other?.full_name ?? 'Kullanıcı'}</p>
                    {conv.last_message && (
                      <span className="text-xs flex-shrink-0 ml-1" style={{ color: C.muted }}>
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>
                    {conv.last_message?.content ?? (conv.last_message?.file_name ? '📎 Dosya' : '')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sağ: Mesaj alanı */}
      {!activeConvId ? (
        <div className="flex-1 flex items-center justify-center" style={{ background: C.bg }}>
          <div className="text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm mb-1" style={{ color: C.muted }}>
              {role === 'psychologist' ? 'Danışanlarınızla mesajlaşın' : 'Mesajlarınız burada görünür'}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              {role === 'psychologist' ? '"Yeni" butonuna basarak başlayın' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col" style={{ background: C.bg }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ background: C.surface, borderColor: C.border }}>
            {activeConv?.participants[0] && (
              <>
                <Avatar name={activeConv.participants[0].full_name} src={activeConv.participants[0].avatar_url} size={36} />
                <div>
                  <p className="text-sm font-medium" style={{ color: C.navy }}>{activeConv.participants[0].full_name}</p>
                  <p className="text-xs capitalize" style={{ color: C.muted }}>
                    {activeConv.participants[0].role === 'psychologist' ? 'Psikolog' :
                     activeConv.participants[0].role === 'admin' ? 'Admin' : 'Danışan'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
              </div>
            ) : messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs lg:max-w-md">
                    {msg.file_url ? (
                      <FilePreview url={msg.file_url} name={msg.file_name ?? 'Dosya'} type={msg.file_type} />
                    ) : (
                      <div className="px-4 py-2.5" style={{
                        background: isMine ? C.blue : C.surface,
                        color: isMine ? '#fff' : C.navy,
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        border: isMine ? 'none' : `0.5px solid ${C.border}`,
                      }}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs" style={{ color: C.muted }}>{formatTime(msg.created_at)}</span>
                      {isMine && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={msg.is_read ? C.blue : C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                          {msg.is_read && <polyline points="20 6 9 17 4 12" transform="translate(3,0)"/>}
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t" style={{ background: C.surface, borderColor: C.border }}>
            <div className="flex items-end gap-2 rounded-2xl border px-4 py-2" style={{ borderColor: C.border }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex-shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40 mb-0.5"
                style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Mesaj yaz..."
                rows={1}
                className="flex-1 resize-none outline-none text-sm"
                style={{ color: C.navy, background: 'transparent', lineHeight: '1.5', maxHeight: 120, border: 'none' }}
              />
              <button onClick={sendMessage} disabled={sending || !input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40 mb-0.5"
                style={{ background: C.blue, border: 'none', cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx" />
          </div>
        </div>
      )}
    </div>
  )
}
