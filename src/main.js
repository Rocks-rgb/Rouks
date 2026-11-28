import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'

const app = document.getElementById('app')

// 👇 هنا تحط رابط الـ Worker بتاعك (انسخه من Cloudflare والصقه هنا بين علامات التنصيص)
const WORKER_URL = 'https://rouk-proxy.am1558272.workers.dev';

const style = {
  container: "min-height:100vh; display:flex; flex-direction:column; background:#f3f4f6; font-family:system-ui, sans-serif; direction:rtl; margin:0;",
  header: "background:#2563eb; color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.1); position:fixed; top:0; left:0; right:0; z-index:10;",
  chatBox: "flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; padding-top:80px; padding-bottom:90px;",
  userBubble: "background:#2563eb; color:white; padding:12px 16px; border-radius:16px 16px 0 16px; max-width:85%; align-self:flex-end; box-shadow:0 1px 2px rgba(0,0,0,0.1); white-space:pre-wrap;",
  aiBubble: "background:white; color:#1f2937; padding:12px 16px; border-radius:16px 16px 16px 0; max-width:85%; align-self:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.1); border:1px solid #e5e7eb; white-space:pre-wrap;",
  inputArea: "position:fixed; bottom:0; left:0; right:0; background:white; padding:10px 12px; display:flex; gap:6px; border-top:1px solid #e5e7eb; align-items:center;",
  inputWrapper: "flex:1; position:relative; display:flex; align-items:center; background:#f9fafb; border-radius:24px; border:1px solid #d1d5db; padding:0 10px;",
  input: "flex:1; padding:12px 5px; border:none; outline:none; font-size:16px; background:transparent;",
  voiceBtn: "background:none; border:none; font-size:20px; cursor:pointer; color:#6b7280; padding:5px;",
  btn: "background:#2563eb; color:white; border:none; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; flex-shrink:0;",
  toolBtn: "background:#e5e7eb; color:#4b5563; border:none; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; flex-shrink:0;"
}

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
        <h1 style="color:#2563eb;font-size:28px;margin:0 0 8px;">أهلاً بك</h1>
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

async function renderChat() {
  app.innerHTML = `
    <div style="${style.container}">
      <header style="${style.header}">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#2563eb; font-weight:bold; font-size:18px;">R</div>
          <h1 style="margin:0; font-size:18px;">Rouks AI</h1>
        </div>
        <select id="model-select" style="background:#1e40af; color:white; border:1px solid #3b82f6; padding:6px 10px; border-radius:8px; font-size:12px; outline:none;">
          <option value="llama-3.1-8b-instant">⚡ خفيف وسريع</option>
          <option value="llama-3.3-70b-versatile" selected>🧠 ثقيل وذكي</option>
        </select>
      </header>
      <main id="chat-box" style="${style.chatBox}">
        <div style="${style.aiBubble}">أهلاً بيك! أنا Rouks. الموقع مؤمن الآن ومحادثاتك محفوظة.</div>
      </main>
      <div style="${style.inputArea}">
        <label for="file-upload" style="${style.toolBtn}" title="رفع صورة">📎<input id="file-upload" type="file" accept="image/*" style="display:none;"></label>
        <button id="image-btn" style="${style.toolBtn}" title="توليد صورة">🎨</button>
        <div style="${style.inputWrapper}">
          <input id="msg-input" type="text" placeholder="اكتب رسالتك هنا..." style="${style.input}">
        </div>
        <button id="send-btn" style="${style.btn}">➤</button>
      </div>
    </div>
  `

  const input = document.getElementById('msg-input')
  const sendBtn = document.getElementById('send-btn')
  const chatBox = document.getElementById('chat-box')
  const modelSelect = document.getElementById('model-select')
  const imageBtn = document.getElementById('image-btn')

  let chatHistory = [
    { role: 'system', content: 'أنت مساعد شخصي اسمك Rouks. بتتكلم بالعربي السوداني البسيط، وشرحك واضح ومباشر بدون مجاملة.' }
  ]

  // 📥 تحميل المحادثات القديمة من قاعدة البيانات
  try {
    const oldMessages = await db.messages.orderBy('id').toArray();
    if (oldMessages.length > 0) {
      chatBox.innerHTML = ''; 
      oldMessages.forEach(msg => {
        addMessageToUI(msg.role, msg.content);
        chatHistory.push({ role: msg.role, content: msg.content });
      });
    }
  } catch (e) { console.log("مفيش رسايل قديمة"); }

  // 🎨 توليد الصور (عبر الوسيط الآمن)
  imageBtn.addEventListener('click', async () => {
    const promptText = input.value.trim();
    if (!promptText) return alert("اكتب وصف للصورة أولاً");
    
    addMessageToUI('user', `🎨 ارسم لي: ${promptText}`);
    await db.messages.add({ role: 'user', content: `🎨 ارسم لي: ${promptText}` });
    input.value = '';
    const typingIndicator = showTyping("جاري رسم الصورة...");

    try {
      // 👇 بنبعت الطلب للـ Worker بتاعنا
      const response = await fetch(`${WORKER_URL}/api/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await response.json();
      typingIndicator.remove();

      if (!data.success) throw new Error(data.errors?.[0]?.message || 'فشل الاتصال');

      const imageUrl = `data:image/jpeg;base64,${data.result.image}`;
      const imgBubble = document.createElement('div');
      imgBubble.style.cssText = style.aiBubble;
      imgBubble.innerHTML = `<img src="${imageUrl}" style="width:100%; border-radius:8px;" />`;
      chatBox.appendChild(imgBubble);
      chatBox.scrollTop = chatBox.scrollHeight;
      
      await db.messages.add({ role: 'assistant', content: `[صورة تم توليدها: ${promptText}]` });

    } catch (error) {
      typingIndicator.remove();
      addMessageToUI('assistant', `❌ فشل: ${error.message}`);
    }
  });

  function addMessageToUI(role, text) {
    const bubble = document.createElement('div')
    bubble.style.cssText = role === 'user' ? style.userBubble : style.aiBubble
    bubble.textContent = text
    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
  }

  function showTyping(msg = "جاري التفكير...") {
    const typing = document.createElement('div')
    typing.id = 'typing-indicator'
    typing.style.cssText = style.aiBubble
    typing.innerHTML = `<span style="color:#6b7280; font-style:italic;">${msg}</span>`
    chatBox.appendChild(typing)
    chatBox.scrollTop = chatBox.scrollHeight
    return typing
  }

  // 💬 إرسال الرسائل (عبر الوسيط الآمن)
  async function sendMessage() {
    const text = input.value.trim()
    if (!text) return
    
    addMessageToUI('user', text)
    await db.messages.add({ role: 'user', content: text })
    chatHistory.push({ role: 'user', content: text })

    input.value = ''
    sendBtn.disabled = true
    const typingIndicator = showTyping()

    try {
      // 👇 بنبعت الطلب للـ Worker بتاعنا
      const response = await fetch(`${WORKER_URL}/api/groq`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelSelect.value, messages: chatHistory })
      })

      const data = await response.json()
      typingIndicator.remove()

      if (data.error) throw new Error(data.error.message || 'مشكلة في الاتصال')
      const reply = data.choices[0].message.content
      
      addMessageToUI('assistant', reply)
      chatHistory.push({ role: 'assistant', content: reply })
      await db.messages.add({ role: 'assistant', content: reply })
      
    } catch (error) {
      typingIndicator.remove()
      addMessageToUI('assistant', `❌ خطأ: ${error.message}`)
    } finally {
      sendBtn.disabled = false
      chatBox.scrollTop = chatBox.scrollHeight
    }
  }

  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage() })
  sendBtn.addEventListener('click', sendMessage)
}

if (!localStorage.getItem('rouks_pin_hash')) renderSetup(); else renderLogin();
