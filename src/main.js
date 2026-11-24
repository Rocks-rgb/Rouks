import './style.css'
import { db } from './db/index.js'
import { hashPin, verifyPin } from './auth.js'

const app = document.getElementById('app')

// --- ستايلات موحدة (محدثة عشان تستوعب الأزرار الجديدة) ---
const style = {
  container: "min-height:100vh; display:flex; flex-direction:column; background:#f3f4f6; font-family:system-ui, sans-serif; direction:rtl; margin:0;",
  header: "background:#2563eb; color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.1); position:fixed; top:0; left:0; right:0; z-index:10;",
  chatBox: "flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; padding-top:80px; padding-bottom:90px;",
  userBubble: "background:#2563eb; color:white; padding:12px 16px; border-radius:16px 16px 0 16px; max-width:85%; align-self:flex-end; box-shadow:0 1px 2px rgba(0,0,0,0.1); white-space:pre-wrap;",
  aiBubble: "background:white; color:#1f2937; padding:12px 16px; border-radius:16px 16px 16px 0; max-width:85%; align-self:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.1); border:1px solid #e5e7eb; white-space:pre-wrap;",
  inputArea: "position:fixed; bottom:0; left:0; right:0; background:white; padding:10px 12px; display:flex; gap:8px; border-top:1px solid #e5e7eb; align-items:center;",
  input: "flex:1; padding:12px 16px; border-radius:24px; border:1px solid #d1d5db; outline:none; font-size:16px; background:#f9fafb;",
  btn: "background:#2563eb; color:white; border:none; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; flex-shrink:0;",
  uploadBtn: "background:#e5e7eb; color:#4b5563; border:none; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; flex-shrink:0;"
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

function renderChat() {
  app.innerHTML = `
    <div style="${style.container}">
      <header style="${style.header}">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#2563eb; font-weight:bold; font-size:18px;">R</div>
          <h1 style="margin:0; font-size:18px;">Rouks AI</h1>
        </div>
        
        <!-- قائمة اختيار الموديل -->
        <select id="model-select" style="background:#1e40af; color:white; border:1px solid #3b82f6; padding:6px 10px; border-radius:8px; font-size:12px; outline:none;">
          <option value="llama-3.1-8b-instant">⚡ خفيف وسريع</option>
          <option value="llama-3.3-70b-versatile" selected>🧠 ثقيل وذكي</option>
        </select>
      </header>
      
      <main id="chat-box" style="${style.chatBox}">
        <div style="${style.aiBubble}">
          أهلاً بيك! أنا Rouks. تقدر ترفعلي صورة (📎) أو تسألني أي حاجة.
        </div>
      </main>

      <!-- منطقة الإدخال -->
      <div style="${style.inputArea}">
        <!-- زرار رفع الصور -->
        <label for="file-upload" style="${style.uploadBtn}">
          📎
          <input id="file-upload" type="file" accept="image/*" style="display:none;">
        </label>
        
        <input id="msg-input" type="text" placeholder="اكتب رسالتك هنا..." style="${style.input}">
        <button id="send-btn" style="${style.btn}">➤</button>
      </div>
    </div>
  `

  document.getElementById('logout-btn')?.addEventListener('click', renderLogin) // حماية لو مش موجود
  const input = document.getElementById('msg-input')
  const sendBtn = document.getElementById('send-btn')
  const chatBox = document.getElementById('chat-box')
  const modelSelect = document.getElementById('model-select')
  const fileUpload = document.getElementById('file-upload')

  let chatHistory = [
    { role: 'system', content: 'أنت مساعد شخصي اسمك Rouks. بتتكلم بالعربي السوداني البسيط، وشرحك واضح ومباشر بدون مجاملة. خليك عملي.' }
  ]

  let currentImageBase64 = null; // لتخزين الصورة المرفوعة مؤقتاً

  // التعامل مع رفع الصور
  fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("الصورة كبيرة جداً! اختار صورة أقل من 4 ميجا.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      currentImageBase64 = event.target.result;
      // عرض علامة إن فيه صورة جاهزة للإرسال
      input.placeholder = "✅ صورة جاهزة للإرسال... اكتب سؤالك أو أرسلها مباشرة";
      input.style.backgroundColor = "#e0f2fe"; 
    };
    reader.readAsDataURL(file);
  });

  function addMessageToUI(role, text, imageUrl = null) {
    const bubble = document.createElement('div')
    bubble.style.cssText = role === 'user' ? style.userBubble : style.aiBubble
    
    // لو فيه صورة، اعرضها فوق النص
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.style.cssText = "max-width:100%; border-radius:8px; margin-bottom:8px; display:block;";
      bubble.appendChild(img);
    }

    if (text) {
      const textNode = document.createElement('span');
      textNode.textContent = text;
      bubble.appendChild(textNode);
    }

    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
    return bubble
  }

  function showTyping() {
    const typing = document.createElement('div')
    typing.id = 'typing-indicator'
    typing.style.cssText = style.aiBubble
    typing.innerHTML = `<span style="color:#6b7280; font-style:italic;">جاري التفكير...</span>`
    chatBox.appendChild(typing)
    chatBox.scrollTop = chatBox.scrollHeight
    return typing
  }

  async function sendMessage() {
    const text = input.value.trim()
    if (!text && !currentImageBase64) return // لو مفيش نص ولا صورة

    // 1. عرض رسالة المستخدم
    addMessageToUI('user', text || 'ما رأيك في هذه الصورة؟', currentImageBase64)
    
    // تجهيز البيانات للـ API
    let messageContent = [];
    if (text) messageContent.push({ type: "text", text: text });
    else messageContent.push({ type: "text", text: "حلل هذه الصورة" });

    if (currentImageBase64) {
      messageContent.push({ type: "image_url", image_url: { url: currentImageBase64 } });
    }

    chatHistory.push({ role: 'user', content: currentImageBase64 ? messageContent : text })

    // تصفير الحقول
    const sentImage = currentImageBase64;
    input.value = ''
    currentImageBase64 = null;
    input.placeholder = "اكتب رسالتك هنا...";
    input.style.backgroundColor = "#f9fafb";
    
    sendBtn.disabled = true
    sendBtn.style.opacity = '0.5'
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

      // اختيار الموديل بناءً على القائمة المنسدلة
      // لو فيه صورة، بنجبر الموديل يستخدم نسخة الـ Vision
      let selectedModel = modelSelect.value;
      if (sentImage) {
        selectedModel = 'llama-3.2-11b-vision-preview'; // موديل قراءة الصور
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatHistory
        })
      })

      const data = await response.json()
      typingIndicator.remove()

      if (data.error) throw new Error(data.error.message || 'مشكلة في الاتصال')

      const reply = data.choices[0].message.content
      addMessageToUI('assistant', reply)
      chatHistory.push({ role: 'assistant', content: reply })
      
      await db.conversations.add({ title: text.substring(0, 20) || "صورة", createdAt: new Date() })
      
    } catch (error) {
      typingIndicator.remove()
      addMessageToUI('assistant', `❌ خطأ: ${error.message}`)
    } finally {
      sendBtn.disabled = false
      sendBtn.style.opacity = '1'
      chatBox.scrollTop = chatBox.scrollHeight
    }
  }

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })
  sendBtn.addEventListener('click', sendMessage)
}

if (!localStorage.getItem('rouks_pin_hash')) {
  renderSetup()
} else {
  renderLogin()
    }
