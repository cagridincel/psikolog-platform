import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  // Sadece available slotlar silinebilir
  // Bağlı appointment varsa slot_id'yi null yap (iptal edilmiş/test verisi)
  await supabase
    .from('appointments')
    .update({ slot_id: null })
    .eq('slot_id', slotId)
    .in('status', ['cancelled', 'pending_approval'])

  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('id', slotId)
    .eq('psychologist_id', user.id)
    .eq('status', 'available')

  if (error) {
    console.error('Slot delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
