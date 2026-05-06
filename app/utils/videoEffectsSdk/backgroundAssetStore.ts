import { nanoid } from 'nanoid'
import type { StoredVideoBackgroundAsset } from './types'

const dbName = 'cloudflare-meet-video-effects'
const storeName = 'background-assets'
const metadataStorageKey = 'video-effects-background-assets'

function isBrowser() {
	return typeof window !== 'undefined'
}

function readMetadata(): StoredVideoBackgroundAsset[] {
	if (!isBrowser()) return []
	try {
		const raw = window.localStorage.getItem(metadataStorageKey)
		if (!raw) return []
		const parsed = JSON.parse(raw) as StoredVideoBackgroundAsset[]
		return Array.isArray(parsed) ? parsed : []
	} catch (error) {
		console.error('Failed to read video background metadata.', error)
		return []
	}
}

function writeMetadata(assets: StoredVideoBackgroundAsset[]) {
	if (!isBrowser()) return
	window.localStorage.setItem(metadataStorageKey, JSON.stringify(assets))
}

async function openDb() {
	if (!isBrowser() || !('indexedDB' in window)) {
		throw new Error('IndexedDB is not available in this browser.')
	}

	return await new Promise<IDBDatabase>((resolve, reject) => {
		const request = window.indexedDB.open(dbName, 1)
		request.onerror = () => reject(request.error)
		request.onupgradeneeded = () => {
			const db = request.result
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName)
			}
		}
		request.onsuccess = () => resolve(request.result)
	})
}

async function runTransaction<T>(
	mode: IDBTransactionMode,
	handler: (store: IDBObjectStore, resolve: (value: T) => void) => void
) {
	const db = await openDb()
	return await new Promise<T>((resolve, reject) => {
		const transaction = db.transaction(storeName, mode)
		transaction.onerror = () => reject(transaction.error)
		transaction.oncomplete = () => db.close()
		handler(transaction.objectStore(storeName), resolve)
	})
}

export async function listStoredVideoBackgroundAssets() {
	return readMetadata().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveVideoBackgroundAsset(file: File) {
	const kind = file.type.startsWith('video/') ? 'video' : 'image'
	const asset: StoredVideoBackgroundAsset = {
		id: nanoid(),
		name: file.name,
		kind,
		mimeType: file.type || (kind === 'video' ? 'video/mp4' : 'image/png'),
		createdAt: new Date().toISOString(),
	}

	await runTransaction<void>('readwrite', (store, resolve) => {
		const request = store.put(file, asset.id)
		request.onsuccess = () => resolve()
	})

	const nextMetadata = [
		asset,
		...readMetadata().filter((item) => item.id !== asset.id),
	]
	writeMetadata(nextMetadata)
	return asset
}

export async function deleteStoredVideoBackgroundAsset(id: string) {
	await runTransaction<void>('readwrite', (store, resolve) => {
		const request = store.delete(id)
		request.onsuccess = () => resolve()
	})
	writeMetadata(readMetadata().filter((item) => item.id !== id))
}

export async function readStoredVideoBackgroundAssetBlob(id: string) {
	return await runTransaction<Blob | undefined>(
		'readonly',
		(store, resolve) => {
			const request = store.get(id)
			request.onsuccess = () => resolve(request.result as Blob | undefined)
		}
	)
}
