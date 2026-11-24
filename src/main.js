import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'

const app = document.getElementById('app')

// --- دوال المصادقة (زي ما هي) ---
function renderLogin() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;font-family:system-ui;direction:rtl;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أدخل رمز الدخول (PIN)</p>
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" style="width:100%;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        <button id="login-btn" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">دخول</button>
        <p id="error-msg" style="color:red;font-size:14px;margin-top:12px;display:none;"></p>
      </div>
    </div>
  `
  document.getElementById('login-btn').addEventListener('click', handleLogin)
}

function renderSetup() {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f9fafb;font-family:system-ui;direction:rtl;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center;">
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">أهلاً بك في Rouks</h1>
        <p style="color:#6b7280;margin:0 0 24px;">أنشئ رمز دخول (4 أرقام) لحماية بياناتك</p>
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" style="width:100%;text-align:center;font-size:24px;letter-spacing:8px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:16px;outline:none;">
        <button id="setup-btn" style="width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">إنشاء وحفظ</button>
      </div>
    </div>
  `
  document.getElementById('setup-btn').addEventListener('click', async () => {
    const pin = document.getElementById('pin-input').value
    if (pin.length !== 4 || isNaN(pin)) return alert('لازم 4 أرقام')
    const hashed = await hashPin(pin)
    localStorage.setItem('rouks_pin_hash', hashed)
    alert('تم إنشاء الرمز بنجاح!')
    renderChat()
  })
}

async function handleLogin() {
  const pin = document.getElementById('pin-input').value
  const storedHash = localStorage.getItem('rouks_pin_hash')
  const err = document.getElementById('error-msg')
  if (!pin) return
  if (await verifyPin(pin, storedHash)) {
    renderChat()
  } else {
    err.textContent = 'رمز الدخول غلط، جرب تاني'
    err.style.display = 'block'
  }
}

// --- واجهة الشات الجديدة ---
function renderChat() {
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100vh;background:#f3f4f6;font-family:system-ui;direction:rtl;">
      <!-- الهيدر -->
      <div style="background:#2563eb;color:white;padding:16px;display:flex;justify-content:space-between;align-items:center;">
        <h1 style="margin:0;font-size:20px;">Rouks AI</h1>
        <button id="logout-btn" style="background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:6px;font-size:12px;cursor:pointer;">خروج</button>
      </div>
      
      <!-- منطقة الرسائل -->
      <div id="chat-box" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div style="background:white;padding:12px;border-radius:8px;max-width:80%;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          أهلاً بيك! أنا Rouks، مساعدك الشخصي. اكتب أي حاجة وأنا هرد عليك.
        </div>
      </div>

      <!-- صندوق الكتابة -->
      <div style="background:white;padding:16px;display:flex;gap:8px;border-top:1px solid #e5e7eb;">
        <input id="msg-input" type="text" placeholder="اكتب رسالتك هنا..." style="flex:1;padding:12px;border:1px solid #d1d5db;border-radius:8px;outline:none;font-size:16px;">
        <button id="send-btn" style="background:#2563eb;color:white;border:none;padding:0 20px;border-radius:8px;font-weight:bold;cursor:pointer;">إرسال</button>
      </div>
    </div>
  `

  document.getElementById('logout-btn').addEventListener('click', renderLogin)
  
  const input = document.getElementById('msg-input')
  const sendBtn = document.getElementById('send-btn')
  const chatBox = document.getElementById('chat-box')

  // إرسال عند الضغط على Enter
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })
  sendBtn.addEventListener('click', sendMessage)

  async function sendMessage() {
    const text = input.value.trim()
    if (!text) return

    // 1. عرض رسالة المستخدم
    chatBox.innerHTML += `
      <div style="background:#2563eb;color:white;padding:12px;border-radius:8px;max-width:80%;align-self:flex-end;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        ${text}
      </div>
    `
    input.value = ''
    chatBox.scrollTop = chatBox.scrollHeight

    // 2. رسالة "جاري التفكير..."
    const loadingId = 'loading-' + Date.now()
    chatBox.innerHTML += `
      <div id="${loadingId}" style="background:white;padding:12px;border-radius:8px;max-width:80%;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.1);color:#6b7280;">
        جاري التفكير... ⏳
      </div>
    `
    chatBox.scrollTop = chatBox.scrollHeight

    try {
      // 3. الاتصال بـ Groq API
      // ⚠️ هنسألك المفتاح بتاعك أول مرة وتخزنه في المتصفح
      let apiKey = localStorage.getItem('groq_api_key')
      if (!apiKey) {
        apiKey = prompt('لو سمحت انسخ ولصق مفتاح Groq API هنا (يبدأ بـ gsk_):')
        if (apiKey) localStorage.setItem('groq_api_key', apiKey.trim())
      }

      if (!apiKey) {
        document.getElementById(loadingId).innerHTML = 'عذراً، مفيش مفتاح API. امسح بيانات الموقع وجرب تاني.'
        return
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: 'أنت مساعد شخصي اسمك Rouks. بتتكلم بالعربي السوداني البسيط، وشرحك واضح ومباشر بدون مجاملة.' },
            { role: 'user', content: text }
          ]
        })
      })

      const data = await response.json()

      // إزالة رسالة التحميل
      document.getElementById(loadingId).remove()

      if (data.error) {
        throw new Error(data.error.message || 'مشكلة في الاتصال بـ Groq')
      }

      // 4. عرض رد الذكاء الاصطناعي
      const reply = data.choices[0].message.content
      chatBox.innerHTML += `
        <div style="background:white;padding:12px;border-radius:8px;max-width:80%;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.1);white-space:pre-wrap;">
          ${reply}
        </div>
      `
      
      // حفظ المحادثة في IndexedDB (اختياري حالياً، هنطوره بعدين)
      await db.conversations.add({ title: text.substring(0, 20), createdAt: new Date() })
      
    } catch (error) {
      document.getElementById(loadingId).remove()
      chatBox.innerHTML += `
        <div style="background:#fee2e2;color:#b91c1c;padding:12px;border-radius:8px;max-width:80%;align-self:flex-start;">
          ❌ خطأ: ${error.message}
        </div>
      `
    }
    chatBox.scrollTop = chatBox.scrollHeight
  }
}

// التشغيل الأولي
if (!localStorage.getItem('rouks_pin_hash')) {
  renderSetup()
} else {
  renderLogin()
}
