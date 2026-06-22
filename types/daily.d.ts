declare module '@daily-co/daily-js' {
  interface DailyParticipant {
    audio: boolean
    video: boolean
    local: boolean
    session_id: string
    user_name: string
    tracks: {
      audio: { persistentTrack?: MediaStreamTrack }
      video: { persistentTrack?: MediaStreamTrack }
    }
  }

  interface DailyParticipants {
    local: DailyParticipant
    [sessionId: string]: DailyParticipant
  }

  interface DailyCallObject {
    join(options: Record<string, unknown>): Promise<void>
    destroy(): void
    setLocalAudio(enabled: boolean): void
    setLocalVideo(enabled: boolean): void
    startScreenShare(): Promise<void>
    stopScreenShare(): Promise<void>
    participants(): DailyParticipants
    on(event: string, handler: (payload?: unknown) => void): this
    leave(): Promise<void>
  }

  interface DailyFactory {
    createCallObject(options?: Record<string, unknown>): DailyCallObject
    createFrame(element: HTMLElement, options?: Record<string, unknown>): DailyCallObject
    destroyAll(): void
  }

  const Daily: DailyFactory
  export default Daily
}
