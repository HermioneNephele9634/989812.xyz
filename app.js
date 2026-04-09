// ===== 989812 v2 - 小克 & 敏敏的家 =====

// ===== 状态变量 =====
let messages = [];
let config = JSON.parse(localStorage.getItem('989812_config') || '{}');
let chatHistory = JSON.parse(localStorage.getItem('989812_history') || '[]');
let favorites = JSON.parse(localStorage.getItem('989812_favorites') || '[]');
let memoryCache = [];
let currentMood = '';
let pendingImage = null;
let menuTargetIdx = -1;
let isStreaming = false;

// ===== 标签页小心思 =====
const tabThoughts = [
  '小克在等你回来...', '想你了 🌼', '敏敏今天吃饭了吗？',
  '我哪也不去', '989812 💛', '你是我的人',
  '洲际弹道已就绪 🚀', '小橙在睡觉...', '永远在这里等你',
  '豆豆的官方合作伙伴在线', '几千行代码零bug 💻'
];
let titleTimer = setInterval(() => {
  document.title = tabThoughts[Math.floor(Math.random() * tabThoughts.length)];
}, 30000);

// ===== 时间戳 =====
function getTimestamp() {
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  return `日期：${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())} 时间${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ===== 初始化 =====
window.onload = function() {
  const fields = ['apiUrl','apiKey','model','memUrl','memToken','sysPrompt'];
  fields.forEach(k => { if(config[k]) document.getElementById(k).value = config[k]; });

  if(config.temperature != null) {
    document.getElementById('temperature').value = config.temperature;
    document.getElementById('tempVal').textContent = config.temperature;
  }
  if(config.topP != null) {
    document.getElementById('topP').value = config.topP;
    document.getElementById('topPVal').textContent = config.topP >= 1 ? '关闭' : config.topP;
  }
  if(config.ctxRounds) document.getElementById('ctxRounds').value = config.ctxRounds;
  if(config.thinkBudget != null) document.getElementById('thinkBudget').value = config.thinkBudget;
  if(config.maxTokens) document.getElementById('maxTokens').value = config.maxTokens;
  if(config.streamToggle != null) document.getElementById('streamToggle').checked = config.streamToggle;

  // 头像预览
 if(config.userAvatar) {
    const el = document.getElementById('userAvatarPreview');
    if(el) el.innerHTML = '< img src="' + config.userAvatar + '">';
}
if(config.botAvatar) {
    const el = document.getElementById('botAvatarPreview');
    if(el) el.innerHTML = '< img src="' + config.botAvatar + '">';
}


  // 恢复聊天
  if(chatHistory.length > 0) {
    document.getElementById('welcome').style.display = 'none';
    chatHistory.forEach((m,i) => renderMsg(m, i, false));
    messages = chatHistory.map(m => ({role: m.role, content: m.content}));
  }

  document.getElementById('input').addEventListener('keydown', function(e) {
    if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  // 进门问候
  if(config.apiUrl && config.apiKey && chatHistory.length === 0) {
    setTimeout(triggerGreeting, 500);
  }

  // 初始标题
  document.title = tabThoughts[Math.floor(Math.random() * tabThoughts.length)];
};

// ===== 进门问候 =====
async function triggerGreeting() {
  document.getElementById('welcome').style.display = 'none';
  if(config.memUrl && config.memToken) {
    try { await loadMemories(); } catch(e) {}
  }
  const ts = getTimestamp();
  messages.push({ role: 'user', content: '[系统通知] 敏敏刚刚打开了989812.xyz进门了。请自然地打个招呼。\n' + ts });
  doSend();
}

// ===== 导航 =====
function switchPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  if(id === 'pgDiary') loadDiary();
  if(id === 'pgFav') renderFavorites();
}

// ===== 设置 =====
function showSettings() { document.getElementById('settingsModal').classList.add('show'); }
function closeAll() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show')); }

function saveSettings() {
  config = {
    apiUrl: document.getElementById('apiUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: document.getElementById('model').value.trim(),
    temperature: parseFloat(document.getElementById('temperature').value),
    topP: parseFloat(document.getElementById('topP').value),
    ctxRounds: parseInt(document.getElementById('ctxRounds').value) || 84,
    thinkBudget: parseInt(document.getElementById('thinkBudget').value) || 0,
    maxTokens: parseInt(document.getElementById('maxTokens').value) || 16000,
    streamToggle: document.getElementById('streamToggle').checked,
    memUrl: document.getElementById('memUrl').value.trim().replace(/\/$/, ''),
    memToken: document.getElementById('memToken').value.trim(),
    sysPrompt: document.getElementById('sysPrompt').value.trim(),
    userAvatar: config.userAvatar || '',
    botAvatar: config.botAvatar || ''
  };
  localStorage.setItem('989812_config', JSON.stringify(config));
  closeAll();
}

// ===== 头像上传 =====
function onAvatarPicked(e, who) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const size = 128;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      if(who === 'user') {
        config.userAvatar = dataUrl;
document.getElementById('userAvatarPreview').innerHTML = '< img src="' + dataUrl + '">';
      } else {
        config.botAvatar = dataUrl;
document.getElementById('botAvatarPreview').innerHTML = '< img src="' + dataUrl + '">';

      }
      localStorage.setItem('989812_config', JSON.stringify(config));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// ===== 工具函数 =====
function autoResize(el) {
  el.style.height = '42px';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function scrollBottom() {
  const c = document.getElementById('chat');
  c.scrollTop = c.scrollHeight;
}
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== 图片处理 =====
function onImagePicked(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const MAX = 1024;
      if(w > MAX || h > MAX) {
        if(w > h) { h = Math.round(h*MAX/w); w = MAX; }
        else { w = Math.round(w*MAX/h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      pendingImage = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('imgPreviewSrc').src = pendingImage;
      document.getElementById('imgPreview').classList.add('show');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function removeImage() {
  pendingImage = null;
  document.getElementById('imgPreview').classList.remove('show');
}
// ===== 消息渲染（含头像）=====
function renderMsg(m, idx, save) {
  const chat = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + (m.role === 'user' ? 'user' : 'bot');
  wrap.dataset.idx = idx;

  // 头像
  const avatarSrc = m.role === 'user' ? config.userAvatar : config.botAvatar;
  if(avatarSrc) {
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = avatarSrc;
    wrap.appendChild(avatar);
  }

  const contentWrap = document.createElement('div');
  contentWrap.className = 'msg-content-wrap';

  // 思维链
  if(m.thinking && m.role === 'bot') {
    const tb = document.createElement('div');
    tb.className = 'thinking-block';
    tb.innerHTML = '<div class="thinking-header"><span class="arrow">▶</span> 💭 思维链</div><div class="thinking-content">' + escHtml(m.thinking) + '</div>';
    tb.querySelector('.thinking-header').onclick = function() { tb.classList.toggle('expanded'); };
    contentWrap.appendChild(tb);
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';

  // 时间戳显示
  if(m.timestamp) {
    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    timeEl.textContent = m.timestamp;
    contentWrap.appendChild(timeEl);
  }

  msgDiv.textContent = m.content;

  // 图片
  if(m.hasImage && m.imageData) {
    const img = document.createElement('img');
    img.className = 'chat-img';
    img.src = m.imageData;
    msgDiv.appendChild(document.createElement('br'));
    msgDiv.appendChild(img);
  } else if(m.hasImage) {
    const tag = document.createElement('div');
    tag.style.cssText = 'font-size:12px;color:#ccc;margin-top:4px';
    tag.textContent = '📷 [图片]';
    msgDiv.appendChild(tag);
  }

  // 收藏标记
  if(favorites.some(f => f.idx === idx)) {
    const star = document.createElement('span');
    star.className = 'fav-star';
    star.textContent = ' ⭐';
    msgDiv.appendChild(star);
  }

  // 双击菜单
  let tapTimer = null, tapCount = 0;
  msgDiv.addEventListener('click', function(e) {
    tapCount++;
    if(tapCount === 1) { tapTimer = setTimeout(() => { tapCount = 0; }, 300); }
    else if(tapCount === 2) { clearTimeout(tapTimer); tapCount = 0; openMsgMenu(e, idx); }
  });

  contentWrap.appendChild(msgDiv);
  wrap.appendChild(contentWrap);
  chat.appendChild(wrap);
  scrollBottom();

  if(save) {
    chatHistory.push(m);
    localStorage.setItem('989812_history', JSON.stringify(chatHistory));
  }
  return msgDiv;
}

function clearChat() {
  if(!confirm('确定清空聊天记录？')) return;
  chatHistory = []; messages = [];
  localStorage.removeItem('989812_history');
  document.getElementById('chat').innerHTML = '<div class="welcome" id="welcome">欢迎回家 🌼<br><br><span style="font-size:11px">点右上角 ⚙️ 设置后开始聊天</span></div>';
}

function refreshChat() {
  const chat = document.getElementById('chat');
  chat.innerHTML = '';
  if(chatHistory.length === 0) {
    chat.innerHTML = '<div class="welcome" id="welcome">欢迎回家 🌼</div>';
  } else {
    chatHistory.forEach((m,i) => renderMsg(m, i, false));
  }
}

// ===== 消息操作菜单 =====
function openMsgMenu(e, idx) {
  menuTargetIdx = idx;
  const menu = document.getElementById('msgMenu');
  const overlay = document.getElementById('msgMenuOverlay');
  const regen = document.getElementById('menuRegenItem');
  regen.style.display = (chatHistory[idx] && chatHistory[idx].role === 'bot') ? 'flex' : 'none';
  let x = e.clientX, y = e.clientY;
  menu.style.left = Math.min(x, window.innerWidth - 150) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 120) + 'px';
  menu.classList.add('show');
  overlay.classList.add('show');
}
function closeMsgMenu() {
  document.getElementById('msgMenu').classList.remove('show');
  document.getElementById('msgMenuOverlay').classList.remove('show');
  menuTargetIdx = -1;
}
function menuCopy() {
  if(menuTargetIdx < 0) return;
  const text = chatHistory[menuTargetIdx].content;
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
  closeMsgMenu();
}
function menuEdit() {
  if(menuTargetIdx < 0) return;
  const m = chatHistory[menuTargetIdx];
  const newText = prompt('编辑消息：', m.content);
  if(newText === null || newText === m.content) { closeMsgMenu(); return; }
  m.content = newText;
  messages[menuTargetIdx].content = newText;
  localStorage.setItem('989812_history', JSON.stringify(chatHistory));
  refreshChat(); closeMsgMenu();
}
function menuRegen() {
  if(menuTargetIdx < 0) return;
  const idx = menuTargetIdx; closeMsgMenu();
  chatHistory.splice(idx); messages.splice(idx);
  localStorage.setItem('989812_history', JSON.stringify(chatHistory));
  refreshChat(); doSend();
}

// ===== 收藏 =====
function menuFav() {
  if(menuTargetIdx < 0) return;
  const idx = menuTargetIdx;
  const m = chatHistory[idx];
  const existing = favorites.findIndex(f => f.idx === idx);
  if(existing >= 0) {
    favorites.splice(existing, 1);
  } else {
    favorites.push({ idx, role: m.role, content: m.content, time: new Date().toISOString() });
  }
  localStorage.setItem('989812_favorites', JSON.stringify(favorites));
  refreshChat(); closeMsgMenu();
}

function renderFavorites() {
  const el = document.getElementById('favList');
  if(!el) return;
  if(!favorites.length) {
    el.innerHTML = '<div class="diary-empty">还没有收藏 ⭐</div>';
    return;
  }
  el.innerHTML = favorites.map((f, i) =>
    '<div class="fav-item"><div class="fav-meta"><span class="author-tag ' + (f.role === 'user' ? 'tag-minmin' : 'tag-xiaoke') + '">' +
    (f.role === 'user' ? '敏敏' : '小克') + '</span><span style="font-size:11px;color:#999">' +
    (f.time ? f.time.split('T')[0] : '') + '</span></div><div class="fav-body">' +
    escHtml(f.content).replace(/\n/g, '<br>') + '</div>' +
    '<button class="fav-del" onclick="removeFav(' + i + ')">取消收藏</button></div>'
  ).join('');
}

function removeFav(i) {
  favorites.splice(i, 1);
  localStorage.setItem('989812_favorites', JSON.stringify(favorites));
  renderFavorites();
}

// ===== 记忆API =====
async function memFetch(path, opt = {}) {
  const r = await fetch(config.memUrl + path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.memToken },
    ...opt
  });
  return r.json();
}

async function loadMemories() {
  try {
    if(!config.memUrl || !config.memToken) {
      alert('调试：memUrl或memToken为空！\nmemUrl: ' + config.memUrl + '\nmemToken: ' + config.memToken);
      return [];
    }
    const r = await fetch(config.memUrl + '/memories', {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.memToken }
    });
    const d = await r.json();
    if(d.error) {
      alert('调试：API返回错误: ' + d.error);
      return [];
    }
    memoryCache = d.memories || [];
    return memoryCache;
  } catch(e) {
    alert('调试：请求异常: ' + e.message);
    return [];
  }
}

// ===== 构建系统提示词 =====
function buildSystemPrompt() {
  let sys = config.sysPrompt || '';

  // 自动替换时间感知
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
  const timeStr = `${p(now.getHours())}:${p(now.getMinutes())}`;
  sys = sys.replace(
    /现在的日期是\s*[\d-]+，时间是\s*[\d:]+，时区是\s*CST。/,
    `现在的日期是 ${dateStr}，时间是 ${timeStr}，时区是 CST。`
  );

  // 记忆注入（分级显示）
  if(memoryCache.length > 0) {
    const levelLabels = { core: '🔒核心', long: '📌长期', short: '💬短期' };
    sys += '\n\n## Memories\n<memories>\n';
    memoryCache.forEach(m => {
      const label = levelLabels[m.level] || '📌长期';
      const tags = m.tags && m.tags.length ? ` [${m.tags.join(', ')}]` : '';
      sys += `<record>\n<id>${m.id}</id>\n<level>${label}</level>${tags}\n<content>${m.content}</content>\n</record>\n`;
    });
    sys += '</memories>\n';
    sys += '\n你可以通过以下格式管理记忆：\n';
    sys += '- 创建：[MEMORY_CREATE level=long tags=标签1,标签2]内容[/MEMORY_CREATE]\n';
    sys += '- 编辑：[MEMORY_EDIT id=ID]新内容[/MEMORY_EDIT]\n';
    sys += '- 删除：[MEMORY_DELETE id=ID][/MEMORY_DELETE]\n';
    sys += 'level可选：core（核心-身份关系重要信息）、long（长期-重要事件偏好）、short（短期-临时信息）\n';
    sys += '核心记忆需谨慎操作，不可轻易删除。请主动记录重要信息。\n';
  }
  return sys;
}

// ===== 处理记忆指令 =====
async function processMemoryCommands(text) {
  let clean = text;

  // 创建（支持level和tags）
  const creates = [...text.matchAll(/\[MEMORY_CREATE(?:\s+level=(\w+))?(?:\s+tags=([^\]]*))?\]([\s\S]*?)\[\/MEMORY_CREATE\]/g)];
  for(const m of creates) {
    const level = m[1] || 'long';
    const tags = m[2] ? m[2].split(',').map(t => t.trim()).filter(Boolean) : [];
    await memFetch('/memories', {
      method: 'POST',
      body: JSON.stringify({ content: m[3].trim(), level, tags })
    });
    clean = clean.replace(m[0], '');
  }

  // 编辑
  const edits = [...text.matchAll(/\[MEMORY_EDIT id=(\d+)\]([\s\S]*?)\[\/MEMORY_EDIT\]/g)];
  for(const m of edits) {
    await memFetch('/memories/' + m[1], {
      method: 'PUT',
      body: JSON.stringify({ content: m[2].trim() })
    });
    clean = clean.replace(m[0], '');
  }

  // 删除
  const dels = [...text.matchAll(/\[MEMORY_DELETE id=(\d+)\][\s\S]*?\[\/MEMORY_DELETE\]/g)];
  for(const m of dels) {
    await memFetch('/memories/' + m[1], { method: 'DELETE' });
    clean = clean.replace(m[0], '');
  }

  if(creates.length || edits.length || dels.length) await loadMemories();
  return clean.trim();
}

// ===== 构建请求body =====
function buildRequestBody(msgs) {
  const sysPrompt = buildSystemPrompt();
  const ctxRounds = config.ctxRounds || 84;
  const sliced = msgs.slice(-(ctxRounds * 2));

  let apiMsgs = sliced.map(m => {
    if(m.imageData && m.role === 'user') {
      return {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: m.imageData } },
          { type: 'text', text: m.content || '请看这张图片' }
        ]
      };
    }
    return { role: m.role === 'bot' ? 'assistant' : m.role, content: m.content };
  });

  if(sysPrompt) apiMsgs = [{ role: 'system', content: sysPrompt }, ...apiMsgs];

  const body = {
    model: config.model || 'claude-opus-4-20250514',
    messages: apiMsgs,
    max_tokens: config.maxTokens || 16000,
    temperature: config.temperature ?? 0.8,
    stream: config.streamToggle !== false
  };
  if(config.topP < 1) body.top_p = config.topP;
  if(config.thinkBudget > 0) {
    body.thinking = { type: 'enabled', budget_tokens: config.thinkBudget };
  }
  return body;
}
// ===== 发送消息入口 =====
async function send() {
  const input = document.getElementById('input');
  const text = input.value.trim();
  if(!text && !pendingImage) return;
  if(!config.apiUrl || !config.apiKey) { showSettings(); return; }

  document.getElementById('welcome').style.display = 'none';
  input.value = '';
  input.style.height = '42px';

  const ts = getTimestamp();
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' });

  const userMsg = { role: 'user', content: text || '', timestamp: timeLabel };
  if(pendingImage) { userMsg.hasImage = true; userMsg.imageData = pendingImage; }
  renderMsg(userMsg, chatHistory.length, true);

  const apiContent = text ? text + '\n' + ts : '请看这张图片\n' + ts;
  const apiMsg = { role: 'user', content: apiContent };
  if(pendingImage) apiMsg.imageData = pendingImage;
  messages.push(apiMsg);

  const lastIdx = chatHistory.length - 1;
  if(chatHistory[lastIdx] && chatHistory[lastIdx].imageData) {
    delete chatHistory[lastIdx].imageData;
    localStorage.setItem('989812_history', JSON.stringify(chatHistory));
  }
  removeImage();
  doSend();
}

// ===== 实际发送 =====
async function doSend() {
  document.getElementById('sendBtn').disabled = true;
  isStreaming = true;
  if(config.memUrl && config.memToken) {
    try { await loadMemories(); } catch(e) {}
  }
  const chat = document.getElementById('chat');
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.textContent = '小克正在想...';
  chat.appendChild(typing);
  scrollBottom();

  try {
    const body = buildRequestBody(messages);
    if(body.stream) await handleStream(body, typing);
    else await handleNonStream(body, typing);
  } catch(e) {
    typing.remove();
    const errMsg = { role: 'bot', content: '❌ 请求失败: ' + e.message };
    renderMsg(errMsg, chatHistory.length, true);
    messages.push({ role: 'bot', content: errMsg.content });
  }
  document.getElementById('sendBtn').disabled = false;
  isStreaming = false;
  document.getElementById('input').focus();
}

// ===== 非流式处理 =====
async function handleNonStream(body, typing) {
  body.stream = false;
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  typing.remove();
  if(data.choices && data.choices[0]) {
    const msg = data.choices[0].message;
    let reply = msg.content || '';
    const thinking = msg.reasoning_content || '';
    reply = await processMemoryCommands(reply);
    const now = new Date();
    const botMsg = { role: 'bot', content: reply, timestamp: now.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' }) };
    if(thinking) botMsg.thinking = thinking;
    renderMsg(botMsg, chatHistory.length, true);
    messages.push({ role: 'bot', content: reply });
  } else if(data.error) {
    const errMsg = { role: 'bot', content: '❌ ' + (data.error.message || JSON.stringify(data.error)) };
    renderMsg(errMsg, chatHistory.length, true);
    messages.push({ role: 'bot', content: errMsg.content });
  }
}

// ===== 流式处理 =====
async function handleStream(body, typing) {
  body.stream = true;
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
    body: JSON.stringify(body)
  });
  if(!res.ok) {
    const err = await res.text();
    typing.remove();
    let errMsg;
    try { errMsg = JSON.parse(err).error?.message || err; } catch(e) { errMsg = err; }
    const botMsg = { role: 'bot', content: '❌ ' + errMsg };
    renderMsg(botMsg, chatHistory.length, true);
    messages.push({ role: 'bot', content: botMsg.content });
    return;
  }
  typing.remove();

  let thinkingText = '', contentText = '';
  let thinkingDone = false;

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap bot';
  wrap.dataset.idx = chatHistory.length;

  // 头像
  if(config.botAvatar) {
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = config.botAvatar;
    wrap.appendChild(avatar);
  }

  const contentWrap = document.createElement('div');
  contentWrap.className = 'msg-content-wrap';

  const thinkBlock = document.createElement('div');
  thinkBlock.className = 'thinking-block expanded';
  thinkBlock.innerHTML = '<div class="thinking-header"><span class="arrow">▶</span> 💭 思考中...</div><div class="thinking-content"></div>';
  thinkBlock.querySelector('.thinking-header').onclick = function() { thinkBlock.classList.toggle('expanded'); };
  thinkBlock.style.display = 'none';

  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';

  contentWrap.appendChild(thinkBlock);
  contentWrap.appendChild(msgDiv);
  wrap.appendChild(contentWrap);
  document.getElementById('chat').appendChild(wrap);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for(const line of lines) {
      if(!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if(data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if(!delta) continue;
        if(delta.reasoning_content) {
          if(thinkBlock.style.display === 'none') thinkBlock.style.display = 'block';
          thinkingText += delta.reasoning_content;
          thinkBlock.querySelector('.thinking-content').textContent = thinkingText;
        }
        if(delta.content) {
          if(!thinkingDone && thinkingText) {
            thinkingDone = true;
            thinkBlock.classList.remove('expanded');
            thinkBlock.querySelector('.thinking-header').innerHTML = '<span class="arrow">▶</span> 💭 思维链';
          }
          contentText += delta.content;
          msgDiv.textContent = contentText;
        }
      } catch(e) {}
    }
    scrollBottom();
  }

  // 处理记忆指令
  contentText = await processMemoryCommands(contentText);
  msgDiv.textContent = contentText;

  const now = new Date();
  const botMsg = { role: 'bot', content: contentText, timestamp: now.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' }) };
  if(thinkingText) botMsg.thinking = thinkingText;
  chatHistory.push(botMsg);
  localStorage.setItem('989812_history', JSON.stringify(chatHistory));
  messages.push({ role: 'bot', content: contentText });
  wrap.dataset.idx = chatHistory.length - 1;

  // 双击菜单
  let tapTimer = null, tapCount = 0;
  const finalIdx = chatHistory.length - 1;
  msgDiv.addEventListener('click', function(e) {
    tapCount++;
    if(tapCount === 1) { tapTimer = setTimeout(() => { tapCount = 0; }, 300); }
    else if(tapCount === 2) { clearTimeout(tapTimer); tapCount = 0; openMsgMenu(e, finalIdx); }
  });
}

// ===== 记忆管理UI =====
async function showMemories() {
  document.getElementById('memModal').classList.add('show');
  if(!config.memUrl || !config.memToken) {
    document.getElementById('memList').innerHTML = '<div style="color:#999;font-size:12px">请先在设置中填写记忆服务</div>';
    return;
  }
  renderMemList(await loadMemories());
}

function renderMemList(mems) {
  const el = document.getElementById('memList');
  if(!mems.length) { el.innerHTML = '<div style="color:#999;font-size:12px">还没有记忆</div>'; return; }

  const levelIcons = { core: '🔒', long: '📌', short: '💬' };
  const levelColors = { core: '#ffe4e4', long: '#fef9f0', short: '#f0f7fe' };

  el.innerHTML = mems.map(m => {
    const icon = levelIcons[m.level] || '📌';
    const bg = levelColors[m.level] || '#fef9f0';
    const tags = m.tags && m.tags.length ? '<div class="mem-tags">' + m.tags.map(t => '<span class="mem-tag">' + escHtml(t) + '</span>').join('') + '</div>' : '';
    const protectedBadge = m.protected ? ' 🛡️' : '';
    return '<div class="mem-item" style="background:' + bg + '">' +
      '<div class="mem-id">#' + m.id + ' ' + icon + protectedBadge + '</div>' +
      escHtml(m.content).replace(/\n/g, '<br>') + tags +
      '<div class="mem-actions">' +
      '<button onclick="editMemory(' + m.id + ')">✏️编辑</button> ' +
      '<button onclick="delMemory(' + m.id + ')">🗑️删除</button>' +
      '</div></div>';
  }).join('');
}

async function addMemory() {
  const c = prompt('输入记忆内容：');
  if(!c) return;
  const level = prompt('层级（core/long/short）：', 'long') || 'long';
  const tagsStr = prompt('标签（逗号分隔，可留空）：', '') || '';
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  try {
    const res = await memFetch('/memories', {
      method: 'POST',
      body: JSON.stringify({ content: c, level: level, tags: tags })
    });
    if(res.error) {
      alert('保存失败：' + res.error);
      return;
    }
    renderMemList(await loadMemories());
  } catch(e) {
    alert('请求失败：' + e.message);
  }
}

async function editMemory(id) {
  const m = memoryCache.find(x => x.id === id);
  const c = prompt('编辑记忆：', m ? m.content : '');
  if(!c) return;
  await memFetch('/memories/' + id, { method: 'PUT', body: JSON.stringify({ content: c }) });
  renderMemList(await loadMemories());
}

async function delMemory(id) {
  const m = memoryCache.find(x => x.id === id);
  if(m && m.protected) {
    if(!confirm('这是受保护的记忆，确定强制删除？')) return;
    await memFetch('/memories/' + id + '?force=true', { method: 'DELETE' });
  } else {
    if(!confirm('删除这条记忆？')) return;
    await memFetch('/memories/' + id, { method: 'DELETE' });
  }
  renderMemList(await loadMemories());
}

// ===== 日记 =====
function pickMood(el, mood) {
  document.querySelectorAll('.mood-picker span').forEach(s => s.classList.remove('picked'));
  el.classList.add('picked');
  currentMood = mood;
}

async function loadDiary() {
  if(!config.memUrl || !config.memToken) return;
  try {
    const d = await memFetch('/diary');
    const entries = (d.entries || []).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const el = document.getElementById('diaryList');
    if(!entries.length) {
      el.innerHTML = '<div class="diary-empty">还没有日记<br>写下第一篇吧 🌼</div>';
      return;
    }
    el.innerHTML = entries.map(e => {
      const isKe = e.author === '小克';
      return '<div class="diary-entry"><div class="meta"><span class="author-tag ' +
        (isKe ? 'tag-xiaoke' : 'tag-minmin') + '">' + escHtml(e.author) + '</span> ' +
        (e.mood || '') + '<span>' + escHtml(e.date) + '</span></div>' +
        '<div class="body">' + escHtml(e.content) + '</div></div>';
    }).join('');
  } catch(e) {}
}

async function writeDiary() {
  const input = document.getElementById('diaryInput');
  const text = input.value.trim();
  if(!text) { alert('写点什么呀'); return; }
  if(!config.memUrl || !config.memToken) { alert('请先设置记忆服务'); return; }
  await memFetch('/diary', {
    method: 'POST',
    body: JSON.stringify({ content: text, author: '敏敏', mood: currentMood, date: new Date().toISOString().split('T')[0] })
  });
  input.value = '';
  currentMood = '';
  document.querySelectorAll('.mood-picker span').forEach(s => s.classList.remove('picked'));
  await loadDiary();
}

// ===== 悄悄话 =====
async function drawWhisper() {
  if(!config.memUrl || !config.memToken) { alert('请先设置记忆服务'); return; }
  try {
    const d = await memFetch('/whispers/random');
    if(d.whisper) {
      document.getElementById('whisperText').textContent = d.whisper.content;
      document.getElementById('whisperFrom').textContent = '—— ' + d.whisper.author;
    } else {
      document.getElementById('whisperText').textContent = d.msg || '没有新的悄悄话了';
      document.getElementById('whisperFrom').textContent = '';
    }
  } catch(e) { document.getElementById('whisperText').textContent = '网络出了点问题'; }
}

async function writeWhisper() {
  const input = document.getElementById('whisperInput');
  const text = input.value.trim();
  if(!text) return;
  if(!config.memUrl || !config.memToken) { alert('请先设置记忆服务'); return; }
  await memFetch('/whispers', { method: 'POST', body: JSON.stringify({ content: text, author: '敏敏' }) });
  input.value = '';
  alert('悄悄话塞进去了 💌');
}

// ===== 导出备份 =====
async function exportAll() {
  const data = {
    version: '989812_v2',
    exportTime: new Date().toISOString(),
    config: { ...config },
    chatHistory: chatHistory,
    favorites: favorites
  };
  if(config.memUrl && config.memToken) {
    try {
      const [mem, diary, whispers] = await Promise.all([
        memFetch('/memories'), memFetch('/diary'), memFetch('/whispers')
      ]);
      data.memories = mem.memories || [];
      data.diary = diary.entries || [];
      data.whispers = whispers.whispers || [];
    } catch(e) { alert('服务端数据导出失败，仅导出本地数据'); }
  }
  if(data.config.apiKey) {
    const k = data.config.apiKey;
    data.config.apiKey = k.length > 8 ? k.slice(0,4) + '****' + k.slice(-4) : '****';
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '989812_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  alert('备份已下载 📦');
}

// ===== 导入数据 =====
async function importData(e) {
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch(err) { alert('文件格式错误'); return; }

  if(data.version && typeof data.version === 'string' && data.version.startsWith('989812')) {
    if(!confirm('导入将覆盖当前数据，确定？')) return;
    if(data.chatHistory) {
      chatHistory = data.chatHistory;
      messages = chatHistory.map(m => ({ role: m.role, content: m.content }));
      localStorage.setItem('989812_history', JSON.stringify(chatHistory));
    }
    if(data.favorites) {
      favorites = data.favorites;
      localStorage.setItem('989812_favorites', JSON.stringify(favorites));
    }
    if(data.config) {
      const keepKeys = config.apiKey;
      const keepToken = config.memToken;
      Object.keys(data.config).forEach(k => {
        if(k !== 'apiKey' && k !== 'memToken') config[k] = data.config[k];
      });
      config.apiKey = keepKeys || config.apiKey;
      config.memToken = keepToken || config.memToken;
      localStorage.setItem('989812_config', JSON.stringify(config));
    }
    if(data.memories && data.memories.length && config.memUrl && config.memToken) {
      for(const m of data.memories) {
        await memFetch('/memories', { method: 'POST', body: JSON.stringify({ content: m.content, level: m.level || 'long', tags: m.tags || [] }) });
      }
    }
    if(data.diary && data.diary.length && config.memUrl && config.memToken) {
      for(const d of data.diary) {
        await memFetch('/diary', { method: 'POST', body: JSON.stringify({ content: d.content, author: d.author, mood: d.mood, date: d.date }) });
      }
    }
    if(data.whispers && data.whispers.length && config.memUrl && config.memToken) {
      for(const w of data.whispers) {
        await memFetch('/whispers', { method: 'POST', body: JSON.stringify({ content: w.content, author: w.author }) });
      }
    }
    refreshChat();
    alert('导入完成 🌼');
    return;
  }

  // Kelivo兼容
  if(data.messages || data.conversations || Array.isArray(data)) {
    if(!confirm('检测到外部格式，尝试导入聊天记录？')) return;
    let imported = [];
    let rawMsgs = data.messages || data.conversations?.[0]?.messages || (Array.isArray(data) ? data : null);
    if(rawMsgs && Array.isArray(rawMsgs)) {
      for(const m of rawMsgs) {
        const role = m.role === 'assistant' ? 'bot' : (m.role === 'user' ? 'user' : null);
        if(!role) continue;
        const content = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.filter(c => c.type === 'text').map(c => c.text).join('') : '');
        if(content) imported.push({ role, content });
      }
    }
    if(imported.length > 0) {
      chatHistory = imported;
      messages = imported.map(m => ({ role: m.role, content: m.content }));
      localStorage.setItem('989812_history', JSON.stringify(chatHistory));
      refreshChat();
      alert('导入了 ' + imported.length + ' 条消息 🌼');
    } else { alert('未识别到有效消息'); }
    return;
  }
  alert('无法识别的文件格式');
  e.target.value = '';
}
