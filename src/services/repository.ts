import { LocalStorageWineRepository } from '@/repositories/LocalStorageWineRepository'

export const repository = new LocalStorageWineRepository(window.localStorage)
