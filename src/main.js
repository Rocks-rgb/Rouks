import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'
// استيراد مكتبات التنسيق والحماية من CDN (مجانية ومفتوحة المصدر)
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js'
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs'

const app = document.getElementById('app')
if (!app) throw new Error('Critical: #app element not found')

const WORKER_URL = 'https://rouk-proxy.am1558272.workers.dev'.replace(/\/+$/, '')

const MAX_MESSAGE_LENGTH = 4000
const MAX_CONTEXT_MESSAGES = 6
const MAX_SAVED_MESSAGES = 300
const MAX_DISPLAYED_MESSAGES = 50

const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
])

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'أنت مساعد شخصي اسمك Rouks. تتحدث بالعربية السودانية البسيطة. إجابتك واضحة ومباشرة ومفيدة.'
}

// إضافة ستايلات لـ Markdown عشان الأكواد تظهر بشكل نظيف
const mdStyles = document.createElement('style')
mdStyles.textContent = `
  .markdown-content pre { background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; margin: 8px 0; font-size: 14px; }
  .markdown-content code { font-family: monospace; background: #e2e8f0; color: #b91c1c; padding: 2px 4px; border-radius: 4px; direction: ltr; display: inline-block; font-size: 14px; }
  .markdown-content pre code { background: transparent; color: inherit; padding: 0; display: block; }
  .markdown-content p { margin: 0 0 8px 0; line-height: 1.6; }
  .markdown-content p:last-child { margin-bottom: 0; }
  .markdown-content ul, .markdown-content ol { padding-right: 20px; margin: 0 0 8px 0; }
  .markdown-content li { margin-bottom: 4px; }
  .markdown-content strong { font-weight: 700; }
  .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 12px 0 8px 0; font-weight: bold; }
`
document.head.appendChild(mdStyles)

const style = {
  container: 'min-height:100vh;display:flex;flex-direction:column;background:#f3f4f6;font-family:system-ui,sans-serif;direction:rtl;margin:0;',
  header: 'background:#2563eb;color:white;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 4px rgba(0,0,0,.1);position:fixed;top:0;left:0;right:0;z-index:10;',
  chatBox: 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;padding-top:80px;padding-bottom:90px;',
  userBubble: 'background:#2563eb;color:white;padding:12px 16px;border-radius:16px 16px 0 16px;max-width:85%;align-self:flex-end;box-shadow:0 1px 2px rgba(0,0,0,.1);white-space:pre-wrap;overflow-wrap:anywhere;',
  aiBubble: 'background:white;color:#1f2937;padding:12px 16px;border-radius:16px 16px 16px 0;max-width:85%;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.1);border:1px solid #e5e7eb;overflow-wrap:anywhere;',
  inputArea: 'position:fixed;bottom:0;left:0;right:0;background:white;padding:10px 12px;display:flex;gap:6px;border-top:1px solid #e5e7eb;align-items:center;',
  inputWrapper: 'flex:1;display:flex;align-items:center;background:#f9fafb;border-radius:24px;border:1px solid #d1d5db;padding:0 10px;min-width:0;',
  input: 'flex:1;padding:12px 5px;border:none;outline:none;font-size:16px;background:transparent;min-width:0;',
  voiceBtn: 'background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;padding:5px;',
  sendBtn: 'background:#2563eb;color:white;border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0;',
  toolBtn: 'background:#e5e7eb;color:#4b5563;border:none;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0;',
  logoutBtn: 'background:#1e40af;color:white;border:1px solid #3b82f6;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:12px;'
}

function isValidPin(pin) {
  return /^[0-9]{4}$/.test(pin)
}

async function postJson(path, payload, timeoutMs = 60000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    const text = await response.text()
    let data = {}
    
    if (text) {
      try { data = JSON.parse(text) } 
      catch { throw new Error('استجابة الخادم غير صالحة') }
    }

    if (!response.ok) {
      const msg = data?.error?.message || data?.error || data?.errors?.[0]?.message
      throw new Error(typeof msg === 'string' ? msg.slice(0, 200) : `خطأ HTTP ${response.status}`)
    }
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('انتهت مهلة الاتصال بالخادم')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function renderLogin() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;font-family:system-ui;direction:rtl;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:400px;width:100%;text-align:center;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أدخل رمز الدخول</p>
        <input id="pin-input" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="width:100%;box-sizing:border-box;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        <button id="login-btn" type="button" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">دخول</button>
        <p id="error-msg" role="alert" style="color:#b91c1c;font-size:14px;margin-top:12px;display:none;"></p>
      </div>
    </div>
  `
  document.getElementById('login-btn').addEventListener('click', handleLogin)
  document.getElementById('pin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleLogin() }
  })
}

function renderSetup() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;font-family:system-ui;direction:rtl;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:400px;width:100%;text-align:center;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">أهلاً بك</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أنشئ رمز دخول من 4 أرقام</p>
        <input id="pin-input" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="width:100%;box-sizing:border-box;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        <button id="setup-btn" type="button" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">إنشاء وحفظ</button>
        <p id="setup-error" role="alert" style="color:#b91c1c;font-size:14px;margin-top:12px;display:none;"></p>
      </div>
    </div>
  `
  const pinInput = document.getElementById('pin-input')
  const setupBtn = document.getElementById('setup-btn')
  const setupError = document.getElementById('setup-error')

  async function doSetup() {
    const pin = pinInput.value
    if (!isValidPin(pin)) {
      setupError.textContent = 'يجب إدخال 4 أرقام بالضبط'; setupError.style.display = 'block'; return
    }
    setupBtn.disabled = true; setupError.style.display = 'none'
    try {
      const hashed = await hashPin(pin)
      if (!hashed) throw new Error('Hash failed')
      localStorage.setItem('rouks_pin_hash', hashed)
      localStorage.removeItem('login_attempts'); localStorage.removeItem('lockout_until')
      await renderChat()
    } catch (err) {
      setupError.textContent = 'تعذر حفظ الرمز.'; setupError.style.display = 'block'
    } finally { setupBtn.disabled = false }
  }
  setupBtn.addEventListener('click', doSetup)
  pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSetup() }
  })
}

async function handleLogin() {
  const pinInput = document.getElementById('pin-input')
  const loginBtn = document.getElementById('login-btn')
  const errMsg = document.getElementById('error-msg')
  const pin = pinInput.value
  const storedHash = localStorage.getItem('rouks_pin_hash')

  if (!storedHash) return renderSetup()

  const lockoutUntil = parseInt(localStorage.getItem('lockout_until') || '0', 10)
  if (Date.now() < lockoutUntil) {
    const mins = Math.ceil((lockoutUntil - Date.now()) / 60000)
    errMsg.textContent = `محظور مؤقتاً. حاول بعد ${mins} دقيقة.`; errMsg.style.display = 'block'; return
  }

  if (!isValidPin(pin)) {
    errMsg.textContent = 'أدخل 4 أرقام.'; errMsg.style.display = 'block'; return
  }

  loginBtn.disabled = true; errMsg.style.display = 'none'
  try {
    if (await verifyPin(pin, storedHash)) {
      localStorage.removeItem('login_attempts'); localStorage.removeItem('lockout_until')
      await renderChat()
    } else {
      let attempts = parseInt(localStorage.getItem('login_attempts') || '0', 10) + 1
      if (attempts >= 5) {
        localStorage.setItem('lockout_until', String(Date.now() + 5 * 60000))
        localStorage.setItem('login_attempts', '0')
        errMsg.textContent = '5 محاولات خاطئة. مقفل 5 دقائق.'
      } else {
        localStorage.setItem('login_attempts', String(attempts))
        errMsg.textContent = `خطأ. باقي ${5 - attempts} محاولات.`
      }
      errMsg.style.display = 'block'
    }
  } catch {
    errMsg.textContent = 'خطأ في التحقق.'; errMsg.style.display = 'block'
  } finally { loginBtn.disabled = false }
}

async function saveMessage(role, content) {
  if (!['user', 'assistant'].includes(role) || typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) return
  try {
    await db.messages.add({ role, content, createdAt: Date.now() })
    const count = await db.messages.count()
    if (count > MAX_SAVED_MESSAGES) {
      const excess = count - MAX_SAVED_MESSAGES
      const oldIds = await db.messages.orderBy('id').limit(excess).primaryKeys()
      if (oldIds.length) await db.messages.where('id').anyOf(oldIds).delete()
    }
  } catch (e) { console.warn('DB Save Error:', e) }
}

async function loadMessages() {
  try {
    const msgs = await db.messages.orderBy('id').reverse().limit(MAX_DISPLAYED_MESSAGES).toArray()
    return msgs.reverse().filter(m => ['user', 'assistant'].includes(m.role))
  } catch { return [] }
}

async function renderChat() {
  app.innerHTML = `
    <div style="${style.container}">
      <header style="${style.header}">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#2563eb;font-weight:bold;font-size:18px;">R</div>
          <h1 style="margin:0;font-size:18px;">Rouks AI</h1>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <select id="model-select" style="background:#1e40af;color:white;border:1px solid #3b82f6;padding:6px 10px;border-radius:8px;font-size:12px;outline:none;">
            <option value="llama-3.1-8b-instant">⚡ خفيف</option>
            <option value="llama-3.3-70b-versatile" selected>🧠 ذكي</option>
          </select>
          <button id="logout-btn" style="${style.logoutBtn}">خروج</button>
        </div>
      </header>
      <main id="chat-box" style="${style.chatBox}">
        <div style="${style.aiBubble}">أهلاً بيك! أنا Rouks. جرب تسألني عن كود برمجي أو أي حاجة عشان تشوف التنسيق الجديد.</div>
      </main>
      <div style="${style.inputArea}">
        <button id="clear-btn" style="${style.toolBtn}">🗑️</button>
        <button id="image-btn" style="${style.toolBtn}">🎨</button>
        <div style="${style.inputWrapper}">
          <input id="msg-input" type="text" maxlength="${MAX_MESSAGE_LENGTH}" placeholder="اكتب رسالتك..." style="${style.input}">
          <button id="voice-btn" style="${style.voiceBtn}">🎤</button>
        </div>
        <button id="send-btn" style="${style.sendBtn}">➤</button>
      </div>
    </div>
  `

  const input = document.getElementById('msg-input')
  const sendBtn = document.getElementById('send-btn')
  const chatBox = document.getElementById('chat-box')
  const modelSelect = document.getElementById('model-select')
  const imageBtn = document.getElementById('image-btn')
  const voiceBtn = document.getElementById('voice-btn')
  const clearBtn = document.getElementById('clear-btn')
  const logoutBtn = document.getElementById('logout-btn')

  let isBusy = false
  let chatHistory = [SYSTEM_MESSAGE]

  // الدالة المحدثة لعرض الرسائل (تنسيق Markdown للـ AI، ونص عادي للمستخدم)
  const addMessageUI = (role, text) => {
    const bubble = document.createElement('div')
    bubble.style.cssText = role === 'user' ? style.userBubble : style.aiBubble
    
    if (role === 'user') {
      bubble.textContent = String(text) // رسائل المستخدم كنص عادي (آمن)
    } else {
      // رسائل الذكاء الاصطناعي: تحويل Markdown إلى HTML ثم تنقيته بـ DOMPurify
      bubble.classList.add('markdown-content')
      const rawHtml = marked.parse(String(text))
      const cleanHtml = DOMPurify.sanitize(rawHtml) // حماية من هجمات XSS
      bubble.innerHTML = cleanHtml
    }
    
    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
  }

  const showTyping = (msg = 'جاري التفكير...') => {
    const t = document.createElement('div')
    t.style.cssText = style.aiBubble
    const span = document.createElement('span')
    span.style.cssText = 'color:#6b7280;font-style:italic;'
    span.textContent = msg
    t.appendChild(span)
    chatBox.appendChild(t)
    chatBox.scrollTop = chatBox.scrollHeight
    return t
  }

  const setBusy = (busy) => {
    isBusy = busy
    ;[sendBtn, imageBtn, input, modelSelect, clearBtn].forEach(el => el.disabled = busy)
    sendBtn.style.opacity = busy ? '0.6' : '1'
    imageBtn.style.opacity = busy ? '0.6' : '1'
  }

  const oldMsgs = await loadMessages()
  if (oldMsgs.length) {
    chatBox.replaceChildren()
    oldMsgs.forEach(m => addMessageUI(m.role, m.content))
    chatHistory = [SYSTEM_MESSAGE, ...oldMsgs.slice(-MAX_CONTEXT_MESSAGES)]
  }

  clearBtn.addEventListener('click', async () => {
    if (isBusy || !confirm('مسح كل المحادثات؟')) return
    try { await db.messages.clear() } catch {}
    chatBox.replaceChildren()
    chatHistory = [SYSTEM_MESSAGE]
    const empty = document.createElement('div'); empty.style.cssText = style.aiBubble
    empty.textContent = 'تم المسح.'; chatBox.appendChild(empty)
  })

  logoutBtn.addEventListener('click', () => { if (!isBusy) renderLogin() })

  async function sendMessage() {
    if (isBusy) return
    const text = input.value.trim()
    if (!text) return
    if (text.length > MAX_MESSAGE_LENGTH) return alert('الرسالة طويلة جداً')

    setBusy(true); addMessageUI('user', text); await saveMessage('user', text); input.value = ''
    const typing = showTyping()

    const payloadMsgs = [
      SYSTEM_MESSAGE,
      ...chatHistory.slice(-MAX_CONTEXT_MESSAGES),
      { role: 'user', content: text }
    ]

    try {
      const data = await postJson('/api/groq', {
        model: ALLOWED_MODELS.has(modelSelect.value) ? modelSelect.value : 'llama-3.3-70b-versatile',
        messages: payloadMsgs
      })
      typing.remove()
      const reply = data?.choices?.[0]?.message?.content
      if (!reply) throw new Error('رد فارغ من الخادم')
      
      addMessageUI('assistant', reply)
      chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: reply })
      await saveMessage('assistant', reply)
    } catch (err) {
      typing.remove()
      addMessageUI('assistant', `❌ خطأ: ${err.message}`)
    } finally {
      setBusy(false); input.focus()
    }
  }

  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
  if (Speech) {
    const rec = new Speech(); rec.lang = 'ar-SA'; rec.interimResults = false;
    voiceBtn.addEventListener('click', () => {
      if (isBusy) return
      try { rec.start(); voiceBtn.style.color = '#dc2626'; input.placeholder = 'جاري الاستماع...' } 
      catch { input.placeholder = 'تعذر بدء الاستماع' }
    })
    rec.onresult = (e) => {
      const txt = e.results?.[0]?.[0]?.transcript
      if (txt) input.value = txt.slice(0, MAX_MESSAGE_LENGTH)
    }
    const resetMic = () => { voiceBtn.style.color = '#6b7280'; input.placeholder = 'اكتب رسالتك...' }
    rec.onerror = resetMic; rec.onend = resetMic
  } else { voiceBtn.style.display = 'none' }

  imageBtn.addEventListener('click', async () => {
    if (isBusy) return
    const prompt = input.value.trim()
    if (!prompt) return addMessageUI('assistant', 'اكتب وصف الصورة أولاً.')
    if (prompt.length > MAX_MESSAGE_LENGTH) return alert('الوصف طويل جداً')

    setBusy(true)
    const uText = `🎨 ارسم لي: ${prompt}`
    addMessageUI('user', uText); await saveMessage('user', uText); input.value = ''
    const typing = showTyping('جاري رسم الصورة...')

    try {
      const data = await postJson('/api/image', { prompt }, 90000)
      typing.remove()
      const b64 = data?.result?.image

      if (data?.success !== true || !b64) throw new Error('لم يتم استلام صورة صالحة')
      if (b64.length > 15_000_000) throw new Error('الصورة كبيرة جداً على الهاتف')

      const binary = atob(b64)
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      const imgUrl = URL.createObjectURL(blob)

      const bubble = document.createElement('div')
      bubble.style.cssText = style.aiBubble
      const img = document.createElement('img')
      img.src = imgUrl; img.alt = 'صورة مولدة'; img.loading = 'lazy'
      img.style.cssText = 'display:block;width:100%;height:auto;border-radius:8px;'
      
      img.onload = () => URL.revokeObjectURL(imgUrl)

      bubble.appendChild(img); chatBox.appendChild(bubble); chatBox.scrollTop = chatBox.scrollHeight
      await saveMessage('assistant', `[صورة: ${prompt.slice(0, 100)}]`)
    } catch (err) {
      typing.remove(); addMessageUI('assistant', `❌ فشل: ${err.message}`)
    } finally {
      setBusy(false); input.focus()
    }
  })

  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendMessage() }
  })
}

try {
  if (localStorage.getItem('rouks_pin_hash')) renderLogin()
  else renderSetup()
} catch {
  app.textContent = 'التطبيق يتطلب تفعيل التخزين المحلي.'
}
