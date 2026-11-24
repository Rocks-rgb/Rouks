import Dexie from 'dexie'

export const db = new Dexie('RouksDB')

db.version(1).stores({
  conversations: '++id, title, createdAt',
  messages: '++id, conversationId, role, content',
  assistants: '++id, name, skill',
  errors: '++id, timestamp, context',
  settings: 'key'
})

export default db
