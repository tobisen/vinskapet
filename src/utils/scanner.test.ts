import { describe, expect, it, vi } from 'vitest'
import { stopMediaTracks } from './scanner'

describe('scanner cleanup', () => {
  it('stops every camera track', () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
    stopMediaTracks({ getTracks: () => tracks })
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true)
  })
})
