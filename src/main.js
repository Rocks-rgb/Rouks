import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'

const app = document.getElementById('app')

// --- دوال المصادقة ---
function renderLogin() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6 bg-gray-50 font-sans" dir="rtl">
      <div class="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full text-center">
        <h1 class="text-blue-600 text-3xl font-bold mb-2">Rouks</h1>
        <p class="text-gray-500 mb-6">أدخل رمز الدخول (PIN)</p>
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" class="w-full text-center text-2xl tracking-[10px] p-3 border-2 border-gray-200 rounded-xl mb-4 outline-none focus:border-blue-500 transition">
        <button id="login-btn" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">دخول</button>
        <p id="error-msg" class="text-red-500 text-sm mt-3 hidden"></p>
      </div>
    </div>
  `
  document.getElementById('login-btn').addEventListener('click', handleLogin)
}

function renderSetup() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6 bg-gray-50 font-sans" dir="rtl">
      <div class="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full text-center">
        <h1 class="text-blue-600 text-3xl font-bold mb-2">أهلاً بك</h1>
        <p class="text-gray-500 mb-6">أنشئ رمز دخول (4 أرقام) لحماية بياناتك</p>
        <input id="pin-input" type="password" maxlength="4" placeholder="••••" class="w-full text-center text-2xl tracking-[10px] p-3 border-2 border-gray-200 rounded-xl mb-4 outline-none focus:border-blue-500 transition">
        <button id="setup-btn" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">إنشاء وحفظ</button>
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
    err.classList.remove('hidden')
  }
}

// --- واجهة الشات المطورة ---
function renderChat() {
  app.innerHTML = `
    <div class="flex flex-col h-screen bg-gray-50 font-sans" dir="rtl">
      <!-- الهيدر -->
      <header class="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xl shadow-sm">R</div>
          <h1 class="text-xl font-bold m-0">Rouks AI</h1>
        </div>
        <button id="logout-btn" class="bg-blue-700 hover:bg-blue-800 text-sm px-4 py-2 rounded-lg transition">خروج</button>
      </header>
      
      <!-- منطقة الرسائل -->
      <main id="chat-box" class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-24">
        <div class="bg-white text-gray-800 p-4 rounded-2xl rounded-tr-none shadow-sm self-start max-w-[85%] border border-gray-100">
          أهلاً بيك! أنا Rouks، مساعدك الشخصي. اكتب أي حاجة وأنا هرد عليك.
        </div>
      </main>

      <!-- صندوق الكتابة (ثابت تحت) -->
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 items-center">
        <input id="msg-input" type="text" placeholder="اكتب رسالتك هنا..." class="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition text-base">
        <button id="send-btn" class="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md hover:bg-blue-700 transition">
          <svg class="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </div>
    </div>
  `

  document.getElementById('logout-btn').addEventListener('click', renderLogin)
  
  const input = document.getElementById('msg-input')
  const sendBtn = document.getElementById('send-btn')
  const chatBox = document.getElementById('chat-box')

  // ذاكرة المحادثة (عشان الذكاء الاصطناعي يفتكر اللي قبله)
  let chatHistory = [
    { role: 'system', content: 'أنت مساعد شخصي اسمك Rouks. بتتكلم بالعربي السوداني البسيط، وشرحك واضح ومباشر بدون مجاملة. خليك عملي.' }
  ]

  function addMessageToUI(role, text) {
    const isUser = role === 'user'
    const bubble = document.createElement('div')
    bubble.className = isUser 
      ? "bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm self-end max-w-[85%] whitespace-pre-wrap" 
      : "bg-white text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm self-start max-w-[85%] border border-gray-100 whitespace-pre-wrap"
    
    bubble.textContent = text
    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
    return bubble
  }

  function showTyping() {
    const typing = document.createElement('div')
    typing.id = 'typing-indicator'
    typing.className = "bg-white text-gray-500 p-4 rounded-2xl rounded-tl-none shadow-sm self-start flex gap-1 border border-gray-100 items-center"
    typing.innerHTML = `
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
    `
    chatBox.appendChild(typing)
    chatBox.scrollTop = chatBox.scrollHeight
    return typing
  }

  async function sendMessage() {
    const text = input.value.trim()
    if (!text) return

    // 1. عرض رسالة المستخدم وإضافتها للذاكرة
    addMessageToUI('user', text)
    input.value = ''
    chatHistory.push({ role: 'user', content: text })

    // 2. تعطيل الإرسال وعرض مؤشر الكتابة
    sendBtn.disabled = true
    sendBtn.classList.add('opacity-50')
    const typingIndicator = showTyping()

    try {
      let apiKey = localStorage.getItem('groq_api_key')
      if (!apiKey) {
        apiKey = prompt('لو سمحت انسخ ولصق مفتاح Groq API هنا (يبدأ بـ gsk_):')
        if (apiKey) localStorage.setItem('groq_api_key', apiKey.trim())
      }

      if (!apiKey) {
        typingIndicator.remove()
        addMessageToUI('assistant', 'عذراً، مفيش مفتاح API. امسح بيانات الموقع وجرب تاني.')
        return
      }

      // إرسال الذاكرة كاملة للـ API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: chatHistory
        })
      })

      const data = await response.json()
      typingIndicator.remove()

      if (data.error) throw new Error(data.error.message || 'مشكلة في الاتصال')

      // 3. عرض رد الذكاء الاصطناعي وإضافته للذاكرة
      const reply = data.choices[0].message.content
      addMessageToUI('assistant', reply)
      chatHistory.push({ role: 'assistant', content: reply })
      
      // حفظ في قاعدة البيانات
      await db.conversations.add({ title: text.substring(0, 20), createdAt: new Date() })
      
    } catch (error) {
      typingIndicator.remove()
      addMessageToUI('assistant', `❌ خطأ: ${error.message}`)
    } finally {
      // إعادة تفعيل زرار الإرسال
      sendBtn.disabled = false
      sendBtn.classList.remove('opacity-50')
      chatBox.scrollTop = chatBox.scrollHeight
    }
  }

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })
  sendBtn.addEventListener('click', sendMessage)
}

// التشغيل الأولي
if (!localStorage.getItem('rouks_pin_hash')) {
  renderSetup()
} else {
  renderLogin()
                                          }
