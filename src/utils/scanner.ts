export interface StoppableMediaStream {
  getTracks(): Array<{ stop(): void }>
}

export function stopMediaTracks(stream?: StoppableMediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
