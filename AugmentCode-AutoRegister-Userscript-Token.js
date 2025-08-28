// ==UserScript==
// @name         AugmentCode批量注册助手 - 快速人类化操作版
// @description  AugmentCode 全自动批量注册 + 完整凭证管理工具 (快速模拟人类操作，阅读时间≤3秒)
// @version      3.2.1
// @author       ank
// @namespace    http://010314.xyz/
// @match        *://*/*
// @match        https://augmentcode.com/*
// @match        https://*.augmentcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_log
// @connect      portal.withorb.com
// @connect      augmentcode.com
// @connect      www.appleemail.top
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  // ==================== 1. 配置和常量 ====================
  
  const CFG = {
    clientID: 'v',
    authURL: 'https://auth.augmentcode.com/authorize',
    orbAPI: 'https://portal.withorb.com/api/v1',
    pricingUnit: 'jWTJo9ptbapMWkvg'
  };

  // API配置
  const API_CONFIG = {
    baseUrl: 'https://www.appleemail.top/api/mail-new'
  };

  // ==================== 2. 全局状态 ====================

  let isAutoRegistering = GM_getValue('isAutoRegistering', false);
  let registrationCount = GM_getValue('registrationCount', 0);
  let accountList = GM_getValue('accountList', []);
  let currentAccountIndex = GM_getValue('currentAccountIndex', 0);

  function saveState() {
    GM_setValue('isAutoRegistering', isAutoRegistering);
    GM_setValue('registrationCount', registrationCount);
    GM_setValue('accountList', accountList);
    GM_setValue('currentAccountIndex', currentAccountIndex);
  }

  // ==================== 3. 工具函数 ====================

  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const json = s => { try { return JSON.parse(s); } catch { return null; } };
  const copy = t => GM_setClipboard ? GM_setClipboard(t) : navigator.clipboard?.writeText(t);
  const fmtDate = iso => {
    try {
      const d = new Date(iso); if (!iso || isNaN(d)) return ''; const pad = n => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    } catch { return ''; }
  };
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); };
  const sha256 = s => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));

  // 人类化操作函数
  const humanLike = {
    // 随机延迟 - 模拟人类思考和反应时间
    randomDelay: (min = 300, max = 1200) => {
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      logger.log(`⏳ 模拟人类操作延迟: ${delay}ms`, 'info');
      return sleep(delay);
    },

    // 模拟人类输入 - 逐字符输入
    async typeText(element, text, charDelay = 30) {
      if (!element) return;

      element.focus();
      await sleep(100); // 聚焦延迟

      element.value = '';
      for (let i = 0; i < text.length; i++) {
        if (!isAutoRegistering) return;

        element.value += text[i];
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // 随机字符间延迟，模拟真实打字速度
        const delay = charDelay + Math.random() * 20;
        await sleep(delay);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(50); // 输入完成后的短暂停顿
    },

    // 模拟人类点击 - 包含鼠标移动和点击延迟
    async clickElement(element) {
      if (!element) return;

      // 模拟鼠标移动到元素上
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await sleep(50 + Math.random() * 100);

      // 模拟鼠标按下和释放
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await sleep(30 + Math.random() * 50);

      element.click();

      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await sleep(50 + Math.random() * 100);
    },

    // 模拟阅读时间 - 限制在3秒以内
    readingDelay: (textLength = 100) => {
      // 快速阅读，最多3秒
      const baseTime = Math.min(textLength * 10, 2000); // 每个字符10ms，最多2秒
      const readingTime = Math.max(500, baseTime + Math.random() * 1000); // 最少0.5秒，最多3秒
      const finalTime = Math.min(readingTime, 3000); // 确保不超过3秒
      logger.log(`📖 模拟阅读时间: ${Math.round(finalTime)}ms`, 'info');
      return sleep(finalTime);
    }
  };

  // 生成UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const http = (url, opt = {}) => new Promise((ok, fail) => {
    GM_xmlhttpRequest({
      method: opt.method || 'GET',
      url,
      headers: opt.headers || {},
      data: opt.data ? JSON.stringify(opt.data) : undefined,
      timeout: 30000, // 增加超时时间到30秒
      onload: r => {
        if (r.status < 300) {
          const result = json(r.responseText) || r.responseText;
          ok(result);
        } else {
          logger.log(`HTTP错误 ${r.status}: ${r.statusText}`, 'error');
          logger.log(`响应内容: ${r.responseText}`, 'error');
          fail(`HTTP ${r.status}: ${r.statusText}`);
        }
      },
      onerror: (error) => {
        logger.log(`网络请求失败: ${JSON.stringify(error)}`, 'error');
        logger.log(`请求URL: ${url}`, 'error');
        fail('网络错误');
      },
      ontimeout: () => {
        logger.log(`请求超时: ${url}`, 'error');
        fail('请求超时');
      }
    });
  });

  async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  }



  // ==================== 4. 数据存储 ====================
  
  const store = {
    get: () => json(GM_getValue('creds', '[]')) || [],
    set: list => GM_setValue('creds', JSON.stringify(list)),
    // 按添加倒序保存：最新插入到数组前面，使用UUID格式ID
    add: item => { const list = store.get(); list.unshift({ id: generateUUID(), created_at: new Date().toISOString(), ...item }); store.set(list); },
    del: id => store.set(store.get().filter(x => x.id !== id)),
    update: (id, patch) => { const list = store.get(); const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = { ...list[i], ...patch }; store.set(list); },
    clear: () => GM_setValue('creds', '[]')
  };

  // ==================== 5. 余额检查模块 ====================

  const balance = {
    async info(token) {
      const sub = await http(`${CFG.orbAPI}/subscriptions_from_link?token=${token}`);
      const subItem = sub.data?.[0];
      const customer = subItem?.customer;
      if (!customer) throw '订阅信息错误';
      const bal = await http(`${CFG.orbAPI}/customers/${customer.id}/ledger_summary?pricing_unit_id=${CFG.pricingUnit}&token=${token}`);
      let included;
      try {
        const pi = (subItem.price_intervals || []).find(x => x.allocation && x.allocation.pricing_unit?.id === CFG.pricingUnit);
        included = pi?.allocation?.amount;
      } catch { }
      return { email: customer.email, balance: bal.credits_balance, endDate: subItem.end_date, included };
    },
    async check(cred) {
      if (!cred.subToken) return 'NO_TOKEN';
      try {
        const info = await this.info(cred.subToken);
        const expired = info.endDate && Date.now() > new Date(info.endDate);
        store.update(cred.id, { lastBalance: info.balance, lastEndDate: info.endDate, lastIncluded: info.included });
        return expired ? 'EXPIRED' : info.balance <= 0 ? 'NO_BALANCE' : 'ACTIVE';
      } catch { return 'ERROR'; }
    }
  };

  // ==================== 6. OAuth处理 ====================
  
  const oauth = {
    async start() {
      logger.log('🚀 OAuth开始函数被调用', 'info');

      // 检查是否有账户列表
      if (!accountList || accountList.length === 0) {
        logger.log('❌ 请先设置账户列表', 'error');
        return;
      }

      logger.log(`📊 账户列表状态: 总数=${accountList.length}, 当前索引=${currentAccountIndex}`, 'info');

      // 检查当前账户索引是否有效
      if (currentAccountIndex >= accountList.length) {
        logger.log('✅ 所有账户注册完成', 'success');
        isAutoRegistering = false;
        saveState();
        updateUI();
        return;
      }

      const currentAccount = accountList[currentAccountIndex];
      const email = currentAccount.email;
      logger.log(`📧 使用账户: ${email} (${currentAccountIndex + 1}/${accountList.length})`, 'info');
      logger.log(`🔑 Client ID: ${currentAccount.clientId}`, 'info');

      const verifier = rand(64), challenge = b64url(await sha256(verifier)), state = rand(16);
      GM_setValue('oauth', JSON.stringify({ verifier, challenge, state, email, currentAccount }));
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: CFG.clientID,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        prompt: 'login'
      });

      const authUrl = `${CFG.authURL}?${params}`;
      logger.log(`🌐 跳转到注册页面: ${authUrl}`, 'info');
      window.location.href = authUrl;
    },

    async token(tenant, code) {
      if (!isAutoRegistering) throw '注册已停止';

      const { verifier } = json(GM_getValue('oauth', '{}')) || {};
      if (!verifier) throw '认证状态丢失';

      const url = tenant.endsWith('/') ? `${tenant}token` : `${tenant}/token`;
      const res = await http(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { grant_type: 'authorization_code', client_id: CFG.clientID, code_verifier: verifier, redirect_uri: '', code }
      });
      return res.access_token || (() => { throw '获取令牌失败' })();
    }
  };

  // ==================== 6. 邮件处理 ====================

  // 使用API获取最新邮件验证码
  async function getVerificationCodeFromAPI(email, refreshToken, clientId) {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      email: email,
      mailbox: 'INBOX',
      response_type: 'json'
    });

    const apiUrl = `${API_CONFIG.baseUrl}?${params}`;

    try {
      logger.log(`📡 调用API: ${apiUrl}`, 'info');
      logger.log(`📧 邮箱: ${email}`, 'info');
      logger.log(`🔑 Client ID: ${clientId}`, 'info');

      const response = await http(apiUrl);

      // 检查API响应格式: {"code":200,"success":true,"data":{...}}
      if (response && response.code === 200 && response.success && response.data) {
        const mailData = response.data;
        const mailText = mailData.text || mailData.html || '';
        const subject = mailData.subject || '';

        logger.log(`📧 收到邮件: ${subject}`, 'info');

        // 提取验证码的正则表达式
        const patterns = [
          /Your verification code is[:\s]*([A-Z0-9]{6})/i,
          /verification code is[:\s]*([A-Z0-9]{6})/i,
          /code[:\s]*([A-Z0-9]{6})/i,
          /验证码[:\s]*([A-Z0-9]{6})/i,
          /验证代码[:\s]*([A-Z0-9]{6})/i,
          /security code[:\s]*([A-Z0-9]{6})/i,
          /\b\d{6}\b/
        ];

        // 先在邮件主题中查找验证码
        for (const pattern of patterns) {
          const match = subject.match(pattern);
          if (match) {
            const code = match[1] || match[0];
            logger.log(`🔍 从邮件主题中提取到验证码: ${code}`, 'success');
            return code;
          }
        }

        // 再在邮件内容中查找验证码
        for (const pattern of patterns) {
          const match = mailText.match(pattern);
          if (match) {
            const code = match[1] || match[0];
            logger.log(`🔍 从邮件内容中提取到验证码: ${code}`, 'success');
            return code;
          }
        }

        logger.log(`⚠️ 邮件中未找到验证码`, 'warning');
        logger.log(`邮件主题: ${subject}`, 'info');
        logger.log(`邮件内容前300字符: ${mailText.substring(0, 300)}...`, 'info');
      } else if (response && response.code !== 200) {
        logger.log(`⚠️ API返回错误码: ${response.code}`, 'warning');
        logger.log(`错误信息: ${response.message || '未知错误'}`, 'warning');
      } else {
        logger.log('⚠️ API响应格式错误或无邮件数据', 'warning');
        logger.log(`完整API响应: ${JSON.stringify(response)}`, 'info');
      }
      return null;
    } catch (error) {
      logger.log(`❌ API获取邮件失败: ${error}`, 'error');
      return null;
    }
  }





  async function getVerificationCode(maxRetries = 6) {
    // 获取当前账户信息
    const { currentAccount } = json(GM_getValue('oauth', '{}')) || {};
    if (!currentAccount) {
      throw new Error('未找到当前账户信息');
    }

    const { email, refreshToken, clientId } = currentAccount;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (!isAutoRegistering) throw new Error('注册已停止');

      logger.log(`📨 通过API获取验证码 ${attempt + 1}/${maxRetries}...`, 'info');

      const code = await getVerificationCodeFromAPI(email, refreshToken, clientId);
      if (code) {
        logger.log(`✅ 成功获取验证码: ${code}`, 'success');
        return code;
      }

      if (attempt < maxRetries - 1) {
        // 使用较短的重试间隔
        const retryDelay = 1500 + (attempt * 500) + Math.random() * 500;
        logger.log(`⏳ 等待 ${Math.round(retryDelay/1000)} 秒后重试...`, 'info');
        await sleep(retryDelay);
      }
    }
    throw new Error('获取验证码失败');
  }

  // ==================== 7. 人机验证处理 ====================

  async function handleHumanVerification() {
    // 先等待验证框出现
    let verifyCheckbox = null;
    let waitTime = 15; // 增加等待时间，更符合人类操作

    for (let i = 0; i < waitTime; i++) {
      if (!isAutoRegistering) return false;

      logger.log(`🤖 检查人机验证状态 ${i + 1}/${waitTime}...`, 'info');

      verifyCheckbox = document.querySelector('input[type="checkbox"]');
      if (verifyCheckbox) {
        logger.log('🔍 发现人机验证复选框', 'info');
        break;
      }

      // 使用较短的随机间隔
      await sleep(500 + Math.random() * 300);
    }

    if (!verifyCheckbox) {
      logger.log('✅ 无需人机验证，直接通过', 'success');
      return true; // 没有验证要求，直接通过
    }

    // 如果有验证框，模拟人类查看和理解的时间
    logger.log('⏳ 模拟人类查看验证要求...', 'info');
    await humanLike.readingDelay(30);

    // 等待用户手动完成验证或自动通过
    logger.log('⚠️ 检测到人机验证，等待手动完成...', 'warning');

    // 检查验证是否已完成
    for (let i = 0; i < 20; i++) { // 最多等待20秒
      if (!isAutoRegistering) return false;

      const checkbox = document.querySelector('input[type="checkbox"]');
      if (!checkbox || checkbox.checked) {
        logger.log('✅ 人机验证已完成', 'success');
        await humanLike.randomDelay(300, 600); // 验证完成后的短暂停顿
        return true;
      }

      await sleep(1000);
    }

    logger.log('❌ 人机验证超时', 'error');
    return false; // 超时
  }

  // ==================== 8. 凭证管理样式 ====================

  // 添加凭证管理样式
  GM_addStyle(`
    #aug-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);z-index:9998}
    #aug{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:min(720px,95vw);max-height:85vh;background:#fff;border:none;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    #aug-head{display:flex;align-items:center;padding:20px 24px 16px;border-bottom:1px solid #f1f5f9;background:#fff;border-top-left-radius:16px;border-top-right-radius:16px;position:sticky;top:0;z-index:1}
    #aug-title{margin:0 0 0 8px;font-weight:600;font-size:18px;color:#0f172a}
    #aug-close{margin-left:auto;cursor:pointer;padding:8px;border-radius:8px;color:#64748b;font-size:16px;transition:all 0.15s}#aug-close:hover{background:#f1f5f9;color:#0f172a}
    #aug-body{overflow:auto;padding:8px 24px 24px;max-height:calc(85vh - 80px);background:#f8fafc}
    .header-stats{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px 20px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-radius:12px;border:1px solid #e2e8f0}
    .stat-item{display:flex;align-items:center;gap:8px;color:#475569;font-size:14px}
    .stat-value{font-weight:600;color:#0f172a}
    .group{margin-bottom:24px}
    .group-title{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;font-weight:600;color:#374151}
    .group-count{font-weight:400;color:#6b7280;font-size:13px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:8px 0;transition:all 0.2s;position:relative}
    .card:hover{border-color:#cbd5e1;box-shadow:0 4px 12px -4px rgba(0,0,0,.1)}
    .card.st-ok{border-left:4px solid #16a34a}
    .card.st-warn{border-left:4px solid #f59e0b}
    .card.st-bad{border-left:4px solid #ef4444}
    .card.st-muted{border-left:4px solid #94a3b8}
    .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .card-title{font-weight:600;font-size:15px;color:#0f172a;margin:0;cursor:pointer}
    .card-title:hover{color:#3b82f6}
    .status{padding:3px 8px;border-radius:12px;font-size:11px;font-weight:500;text-transform:uppercase}
    .ok{background:#dcfce7;color:#166534}.bad{background:#fee2e2;color:#991b1b}.warn{background:#fef3c7;color:#92400e}.muted{background:#f1f5f9;color:#64748b}
    .info-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;font-size:13px;color:#6b7280}
    .info-item{display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s}
    .info-item:hover{background:#f3f4f6}
    .info-value{color:#374151;font-weight:500}
    .progress{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin:8px 0}
    .progress-bar{height:100%;background:linear-gradient(90deg,#10b981,#3b82f6);transition:width 0.3s ease}
    .clickable{cursor:pointer;padding:4px 6px;border-radius:4px;transition:all 0.15s;font-family:ui-monospace,monospace;font-size:12px;background:#f8fafc;border:1px solid #f1f5f9}
    .clickable:hover{background:#f1f5f9;border-color:#e2e8f0}
    .actions{display:flex;gap:6px;justify-content:flex-end;margin-top:12px;padding-top:8px;border-top:1px solid #f1f5f9}
    .btn{padding:6px 12px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all 0.15s}
    .btn-primary{background:#3b82f6;color:#fff}.btn-primary:hover{background:#2563eb}
    .btn-secondary{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}.btn-secondary:hover{background:#e2e8f0}
    .btn-danger{background:#ef4444;color:#fff}.btn-danger:hover{background:#dc2626}
    .btn-ghost{background:transparent;color:#6b7280;border:1px solid #d1d5db}.btn-ghost:hover{background:#f9fafb;color:#374151}
    .empty-state{text-align:center;padding:40px 20px;color:#64748b}
    .copy-flash{background:#dbeafe !important;border-color:#93c5fd !important}
  `);

  // ==================== 9. UI控制面板 ====================

  // 面板状态管理
  let isPanelMinimized = false;

  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = "auto-register-log";
    panel.style.cssText = `
      position: fixed; bottom: 40px; left: 20px; width: 320px; max-height: 450px;
      background: rgba(30, 30, 30, 0.95); border-radius: 10px; z-index: 10000;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); font-family: 'Segoe UI', sans-serif;
      overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease;
      cursor: pointer;
    `;

    panel.innerHTML = `
      <div id="panel-header" style="padding: 14px 16px; background: #3498db; color: white; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
        <span id="panel-title">批量注册助手</span>
        <div id="panel-buttons">
          <button id="account-management" style="background: #9b59b6; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; margin-right: 8px;">账户</button>
          <button id="start-batch-registration" style="background: #2ecc71; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; margin-right: 8px;">开始批量注册</button>
          <button id="stop-registration" style="background: #e74c3c; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; margin-right: 8px; display: none;">停止注册</button>
          <button id="credential-management" style="background: #3498db; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; margin-right: 8px;">凭证管理</button>
          <button id="clear-log" style="background: transparent; border: 1px solid rgba(255, 255, 255, 0.7); color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; margin-right: 8px;">清除</button>
          <button id="minimize-panel" style="background: #f39c12; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 4px; font-weight: bold;" title="缩小到15px正方形">−</button>
        </div>
      </div>
      <div id="panel-status" style="padding: 8px 16px; background: #2c3e50; font-size: 12px; color: #ecf0f1; display: flex; justify-content: space-between;">
        <span>状态: <span id="status-text">${isAutoRegistering ? '注册中' : '已停止'}</span></span>
        <span>账户: <span id="account-progress">${currentAccountIndex}/${accountList.length}</span> | 已注册: <span id="account-count">${registrationCount}</span></span>
      </div>
      <div id="log-content" style="padding: 16px; overflow-y: auto; max-height: calc(450px - 120px); font-size: 14px; color: #ecf0f1; line-height: 1.5;"></div>
    `;

    document.body.appendChild(panel);

    // 面板缩小/放大切换函数
    function togglePanelSize() {
      const panel = document.getElementById('auto-register-log');
      const header = document.getElementById('panel-header');
      const status = document.getElementById('panel-status');
      const content = document.getElementById('log-content');
      const title = document.getElementById('panel-title');
      const buttons = document.getElementById('panel-buttons');

      if (!isPanelMinimized) {
        // 缩小到15px正方形
        isPanelMinimized = true;
        panel.style.cssText = `
          position: fixed; bottom: 40px; left: 20px; width: 15px; height: 15px;
          background: #e74c3c; border-radius: 3px; z-index: 10001;
          box-shadow: 0 0 10px rgba(231, 76, 60, 0.8); cursor: pointer;
          transition: all 0.3s ease; border: 2px solid #fff;
        `;
        // 隐藏所有内容
        if (header) header.style.display = 'none';
        if (status) status.style.display = 'none';
        if (content) content.style.display = 'none';

        // 添加闪烁效果提示用户
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          panel.style.background = flashCount % 2 === 0 ? '#e74c3c' : '#f39c12';
          flashCount++;
          if (flashCount >= 6) {
            clearInterval(flashInterval);
            panel.style.background = '#e74c3c';
          }
        }, 200);

      } else {
        // 恢复正常大小
        isPanelMinimized = false;
        panel.style.cssText = `
          position: fixed; bottom: 40px; left: 20px; width: 320px; max-height: 450px;
          background: rgba(30, 30, 30, 0.95); border-radius: 10px; z-index: 10000;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); font-family: 'Segoe UI', sans-serif;
          overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease;
          cursor: pointer;
        `;
        // 显示所有内容
        if (header) header.style.display = 'flex';
        if (status) status.style.display = 'flex';
        if (content) content.style.display = 'block';
      }
    }

    // 为整个面板添加点击事件（仅在缩小状态下生效）
    panel.addEventListener('click', (e) => {
      if (isPanelMinimized) {
        e.stopPropagation();
        togglePanelSize();
      }
    });

    // 恢复日志
    setTimeout(() => {
      try {
        const savedLogs = GM_getValue('batchRegisterLogs', '[]');
        const logs = JSON.parse(savedLogs);
        const logContent = document.getElementById('log-content');

        if (logContent && logs.length > 0) {
          logs.forEach(logItem => {
            const logEntry = document.createElement('div');
            logEntry.style.cssText = `margin-bottom: 10px; padding: 12px; border-radius: 6px; word-break: break-all;`;

            const colors = {
              success: 'rgba(46, 204, 113, 0.2)',
              error: 'rgba(231, 76, 60, 0.2)',
              warning: 'rgba(243, 156, 17, 0.2)',
              info: 'rgba(255, 255, 255, 0.05)'
            };

            logEntry.style.backgroundColor = colors[logItem.type] || colors.info;
            logEntry.textContent = `[${logItem.time}] ${logItem.message}`;
            logContent.appendChild(logEntry);
          });
          logContent.scrollTop = logContent.scrollHeight;
        }
      } catch (e) {}
    }, 500);

    // 绑定事件（延迟执行确保DOM已添加）
    setTimeout(() => {
      const accountBtn = document.getElementById('account-management');
      const startBtn = document.getElementById('start-batch-registration');
      const stopBtn = document.getElementById('stop-registration');
      const credentialBtn = document.getElementById('credential-management');
      const clearBtn = document.getElementById('clear-log');
      const minimizeBtn = document.getElementById('minimize-panel');

      if (accountBtn) accountBtn.onclick = showAccountManagement;
      if (startBtn) startBtn.onclick = startBatchRegistration;
      if (stopBtn) stopBtn.onclick = stopBatchRegistration;
      if (credentialBtn) credentialBtn.onclick = showCredentialManagement;
      if (clearBtn) clearBtn.onclick = () => {
        GM_setValue('batchRegisterLogs', '[]');
        document.getElementById('log-content').innerHTML = '';
        logger.log('日志已清除', 'info');
      };

      // 缩小按钮事件
      if (minimizeBtn) {
        minimizeBtn.onclick = (e) => {
          e.stopPropagation(); // 防止触发面板点击事件
          togglePanelSize();
        };
      }

      // 初始化UI状态
      updateUI();
    }, 100);

    return {
      log: function(message, type = 'info') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });

        // 保存到GM存储
        try {
          const savedLogs = GM_getValue('batchRegisterLogs', '[]');
          const logs = JSON.parse(savedLogs);
          logs.push({ time, message, type });

          // 只保留最近50条日志
          if (logs.length > 50) logs.splice(0, logs.length - 50);

          GM_setValue('batchRegisterLogs', JSON.stringify(logs));
        } catch (e) {}

        // 显示日志
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `margin-bottom: 10px; padding: 12px; border-radius: 6px; word-break: break-all;`;

        const colors = {
          success: 'rgba(46, 204, 113, 0.2)',
          error: 'rgba(231, 76, 60, 0.2)',
          warning: 'rgba(243, 156, 17, 0.2)',
          info: 'rgba(255, 255, 255, 0.05)'
        };

        logEntry.style.backgroundColor = colors[type] || colors.info;
        logEntry.textContent = `[${time}] ${message}`;

        const logContent = document.getElementById('log-content');
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
      }
    };
  }

  const logger = createControlPanel();

  // ==================== 9. 控制函数 ====================

  function startBatchRegistration() {
    isAutoRegistering = true;
    saveState();
    updateUI();
    logger.log('🚀 开始批量注册', 'success');
    oauth.start();
  }

  function stopBatchRegistration() {
    isAutoRegistering = false;
    saveState();
    updateUI();
    logger.log('⏹️ 已停止注册', 'warning');
  }

  function updateUI() {
    const startBtn = document.getElementById('start-batch-registration');
    const stopBtn = document.getElementById('stop-registration');
    const statusText = document.getElementById('status-text');
    const accountCount = document.getElementById('account-count');
    const accountProgress = document.getElementById('account-progress');

    if (startBtn && stopBtn) {
      if (isAutoRegistering) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        startBtn.textContent = '注册中...';
        stopBtn.textContent = '停止注册';
      } else {
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        startBtn.textContent = '开始批量注册';
        stopBtn.textContent = '停止注册';
      }
    }

    if (statusText) statusText.textContent = isAutoRegistering ? '注册中' : '已停止';
    if (accountCount) accountCount.textContent = registrationCount;
    if (accountProgress) accountProgress.textContent = `${currentAccountIndex}/${accountList.length}`;
  }



  // ==================== 凭证管理UI ====================

  const ui = {
    show(html) {
      const old = $('#aug'); if (old) old.remove(); const oldov = $('#aug-overlay'); if (oldov) oldov.remove();
      const ov = document.createElement('div'); ov.id = 'aug-overlay';
      const el = document.createElement('div'); el.id = 'aug';
      el.innerHTML = `
        <div id="aug-head">🔑<h3 id="aug-title">凭证管理</h3><span id="aug-close">✕</span></div>
        <div id="aug-body">${html}</div>`;
      document.body.appendChild(ov); ov.appendChild(el);
      const close = () => { try { el.remove(); } catch { } try { ov.remove(); } catch { } document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      $('#aug-close').onclick = close;
      ov.addEventListener('click', close);
      el.addEventListener('click', e => e.stopPropagation());
      return el;
    },
    toast(msg, ms = 2000) { const el = this.show(`<div style=\"text-align:center;padding:20px\">${msg}</div>`); setTimeout(() => el.remove(), ms); return el; },
    card(cred, status) {
      const st = status || cred.status || 'UNKNOWN';
      const badge = { ACTIVE: 'ok', EXPIRED: 'bad', NO_BALANCE: 'bad', ERROR: 'warn', NO_TOKEN: 'muted' }[st] || 'muted';
      const stateClass = { ACTIVE: 'st-ok', EXPIRED: 'st-bad', NO_BALANCE: 'st-bad', ERROR: 'st-warn', NO_TOKEN: 'st-muted', UNKNOWN: 'st-muted' }[st] || 'st-muted';
      const text = { ACTIVE: '正常', EXPIRED: '已过期', NO_BALANCE: '余额不足', ERROR: '检测失败', NO_TOKEN: '无令牌' }[st] || '未知';
      const subURL = cred.subToken ? `https://portal.withorb.com/view?token=${cred.subToken}` : '';
      const used = (cred.lastIncluded && cred.lastBalance != null) ? Math.max(0, Number(cred.lastIncluded) - Number(cred.lastBalance)) : null;
      const pct = (cred.lastIncluded && cred.lastBalance != null) ? Math.min(100, Math.max(0, Math.round((Number(cred.lastBalance) / Number(cred.lastIncluded)) * 100))) : null;

      const metrics = (cred.lastBalance || cred.lastEndDate || cred.lastIncluded) ?
        `<div class=\"info-row\">
          <div class=\"info-item\" title=\"复制余额\" data-copy="${cred.lastBalance ?? ''}">💬 <span class=\"info-value\">${cred.lastBalance ?? '?'}</span>${cred.lastIncluded ? ` / ${cred.lastIncluded}` : ''}${used != null ? ` · 已用: ${used}` : ''}</div>
          ${cred.lastEndDate ? `<div class=\"info-item\" title=\"复制到期时间\" data-copy=\"${fmtDate(cred.lastEndDate)} UTC\">⏳ <span class=\"info-value\">${fmtDate(cred.lastEndDate)} UTC</span></div>` : ''}
        </div>
        ${pct != null ? `<div class=\"progress\"><div class=\"progress-bar\" style=\"width:${pct}%\"></div></div>` : ''}` : '';

      return `<div class=\"card ${stateClass}\">
        <div class=\"card-header\">
          <h4 class=\"card-title\" title=\"点击复制该凭证\" data-copy-cred=\"${cred.id}\">${cred.email || `ID: ${cred.id}`}</h4>
          <span class=\"status ${badge}\">${text}</span>
        </div>
        ${metrics}
        <div class=\"clickable\" data-copy=\"${cred.tenant}\" title=\"点击复制租户URL\">🔗 ${cred.tenant}</div>
        <div class=\"clickable\" data-copy=\"${cred.token}\" title=\"点击复制访问令牌\">🔑 ${cred.token}</div>
        ${subURL ? `<div class=\"clickable\" data-copy=\"${subURL}\" title=\"点击复制订阅URL\">📊 ${subURL}</div>` : ''}
        <div class=\"actions\">
          <button class=\"btn btn-secondary\" data-check=\"${cred.id}\">检测</button>
          ${subURL ? `<a class=\"btn btn-secondary\" href=\"${subURL}\" target=\"_blank\">订阅</a>` : ''}
          <button class=\"btn btn-danger\" data-del=\"${cred.id}\">删除</button>
        </div>
      </div>`;
    },
    list(creds, statuses = {}) {
      const total = creds.length;
      const active = creds.filter(c => (statuses[c.id] || c.status) === 'ACTIVE').length;
      const abnormal = creds.filter(c => ['EXPIRED', 'NO_BALANCE', 'ERROR'].includes(statuses[c.id] || c.status)).length;
      const noToken = creds.filter(c => (statuses[c.id] || c.status) === 'NO_TOKEN').length;

      const header = `
        <div class=\"header-stats\">
          <div class=\"stat-item\">🔑 <span>凭证管理</span> <span style=\"color:#94a3b8\">共 <span class=\"stat-value\">${total}</span> 个</span></div>
          <div class=\"stat-item\">✅ 正常 <span class=\"stat-value\">${active}</span></div>
          <div class=\"stat-item\">🔒 异常 <span class=\"stat-value\">${abnormal}</span></div>
          <div class=\"stat-item\">⚠️ 无令牌 <span class=\"stat-value\">${noToken}</span></div>
          <button class=\"btn btn-primary\" id=\"batch\" style=\"margin-left:auto\">批量检测</button>
          <button class=\"btn btn-secondary\" id=\"exportAll\">导出格式</button>
          <button class=\"btn btn-danger\" id=\"clearAll\">一键清空</button>
        </div>`;

      const groupBy = (pred) => creds.filter(pred).map(c => this.card(c, statuses[c.id])).join('') || '<div class=\"empty-state\">无</div>';
      const okHtml = groupBy(c => (statuses[c.id] || c.status) === 'ACTIVE');
      const badHtml = groupBy(c => ['EXPIRED', 'NO_BALANCE', 'ERROR'].includes(statuses[c.id] || c.status));
      const emptyHtml = groupBy(c => (statuses[c.id] || c.status) === 'NO_TOKEN');

      const body = `
        <div class=\"group\"><div class=\"group-title\">✅ 正常 <span class=\"group-count\">${active}</span></div>${okHtml}</div>
        <div class=\"group\"><div class=\"group-title\">🔒 异常 <span class=\"group-count\">${abnormal}</span></div>${badHtml}</div>
        <div class=\"group\"><div class=\"group-title\">⚠️ 无令牌 <span class=\"group-count\">${noToken}</span></div>${emptyHtml}</div>`;

      const el = this.show(header + body);

      // 点击复制（单项）
      el.querySelectorAll('[data-copy]').forEach(x => x.onclick = () => { copy(x.dataset.copy); x.classList.add('copy-flash'); setTimeout(() => x.classList.remove('copy-flash'), 400); });
      // 点击标题复制整条凭证（JSON）
      el.querySelectorAll('[data-copy-cred]').forEach(h => h.onclick = () => {
        const id = h.getAttribute('data-copy-cred'); // 现在ID是字符串，不需要转数字
        const cred = creds.find(c => c.id === id);
        copy(JSON.stringify(cred, null, 2));
        h.classList.add('copy-flash'); setTimeout(() => h.classList.remove('copy-flash'), 400);
      });

      // 生成带时区 ISO 字符串（形如 2025-08-19T03:51:23.8457265+08:00）
      const isoWithTZ = (d=new Date()) => {
        const pad=n=>String(n).padStart(2,'0');
        const y=d.getFullYear(), m=pad(d.getMonth()+1), day=pad(d.getDate());
        const hh=pad(d.getHours()), mm=pad(d.getMinutes()), ss=pad(d.getSeconds());
        const ms=String(d.getMilliseconds()).padStart(3,'0');
        const off=-d.getTimezoneOffset();
        const sign=off>=0?'+':'-';
        const th=pad(Math.floor(Math.abs(off)/60)), tm=pad(Math.abs(off)%60);
        return `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms}0000${sign}${th}:${tm}`;
      };

      // 导出格式化数据
      const exportBtn = document.getElementById('exportAll');
      if (exportBtn) exportBtn.onclick = () => {
        const exportData = creds.map(cred => ({
          id: cred.id,
          portal_info: {
            email: cred.email,
            credits_balance: parseInt(cred.lastBalance) || 50,
            expiry_date: cred.lastEndDate || null,
            is_active: (cred.status === 'ACTIVE'),
            last_updated: isoWithTZ()
          },
          tenant_url: cred.tenant,
          access_token: cred.token,
          portal_url: cred.subToken ? `https://portal.withorb.com/view?token=${cred.subToken}` : null
        }));
        copy(JSON.stringify(exportData, null, 2));
        alert('导出数据已复制到剪贴板');
      };

      // 一键清空
      const clearBtn = document.getElementById('clearAll');
      if (clearBtn) clearBtn.onclick = () => {
        if (confirm('确定要清空所有凭证吗？此操作不可恢复！')) {
          store.clear();
          // 同时重置注册计数
          registrationCount = 0;
          saveState();
          updateUI();
          actions.manage();
        }
      };

      el.querySelectorAll('[data-del]').forEach(x => x.onclick = () => confirm('确定删除？') && (store.del(x.dataset.del), actions.manage()));
      el.querySelectorAll('[data-check]').forEach(x => x.onclick = () => actions.check(x.dataset.check));
      document.getElementById('batch').onclick = actions.batch;
    }
  };

  // Actions
  const actions = {
    auth: () => oauth.start(),
    async manage() {
      const creds = store.get();
      if (!creds.length) return ui.toast('暂无凭证');
      const toastEl = ui.toast('加载中...', 200000);
      const statuses = {};
      await Promise.all(creds.map(async c => { statuses[c.id] = await balance.check(c); }));
      // 读取更新后的凭证（包含 lastBalance/lastEndDate/lastIncluded）
      const updatedCreds = store.get();
      toastEl?.remove?.();
      ui.list(updatedCreds, statuses);
    },
    async check(id) {
      const cred = store.get().find(x => x.id === id);
      if (!cred) return;
      const toastEl = ui.toast('检测中...', 10000);
      const status = await balance.check(cred);
      store.update(id, { status });
      toastEl?.remove?.();
      actions.manage();
    },
    async batch() {
      const creds = store.get();
      const toastEl = ui.toast('批量检测中...', 200000);

      await Promise.allSettled(creds.map(async c => {
        const status = await balance.check(c);
        store.update(c.id, { status });
        return status;
      }));
      toastEl?.remove?.();
      actions.manage()
    }
  };

  function showCredentialManagement() {
    logger.log('📋 打开凭证管理界面...', 'info');
    actions.manage();
  }

  // 账户管理函数
  function showAccountManagement() {
    logger.log('👥 打开账户管理界面...', 'info');

    const accountText = accountList.map(acc =>
      `${acc.email}----${acc.password}----${acc.clientId}----${acc.refreshToken}`
    ).join('\n');

    const html = `
      <div style="padding: 20px;">
        <h3 style="margin-top: 0; color: #2c3e50;">账户管理</h3>

        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #27ae60;">
          <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">📡 API地址:</div>
          <div style="font-family: monospace; font-size: 12px; color: #7f8c8d;">${API_CONFIG.baseUrl}</div>
          <small style="color: #7f8c8d; display: block; margin-top: 5px;">
            使用固定API地址获取验证码
          </small>
        </div>

        <p style="color: #7f8c8d; margin-bottom: 15px;">
          每行一个账户，格式：邮箱----密码----client_id----refresh_token
        </p>
        <textarea id="account-textarea"
                  style="width: 100%; height: 300px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"
                  placeholder="example@outlook.com----password123----client-id-here----refresh-token-here">${accountText}</textarea>
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
          <button id="save-accounts" style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">保存账户</button>
          <button id="clear-accounts" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">清空账户</button>
          <button id="cancel-accounts" style="background: #95a5a6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">取消</button>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
          当前账户数量: ${accountList.length} | 当前进度: ${currentAccountIndex}/${accountList.length}
        </div>
      </div>
    `;

    const el = ui.show(html);

    // 绑定按钮事件
    document.getElementById('save-accounts').onclick = () => {
      const textarea = document.getElementById('account-textarea');
      const text = textarea.value.trim();

      if (!text) {
        alert('请输入账户信息');
        return;
      }

      const lines = text.split('\n').filter(line => line.trim());
      const newAccountList = [];

      for (const line of lines) {
        const parts = line.split('----');
        if (parts.length !== 4) {
          alert(`格式错误: ${line}\n正确格式: 邮箱----密码----client_id----refresh_token`);
          return;
        }

        newAccountList.push({
          email: parts[0].trim(),
          password: parts[1].trim(),
          clientId: parts[2].trim(),
          refreshToken: parts[3].trim()
        });
      }

      accountList = newAccountList;
      currentAccountIndex = 0;
      saveState();
      updateUI();

      logger.log(`✅ 已保存 ${accountList.length} 个账户`, 'success');
      el.remove();
    };

    document.getElementById('clear-accounts').onclick = () => {
      if (confirm('确定要清空所有账户吗？')) {
        accountList = [];
        currentAccountIndex = 0;
        saveState();
        updateUI();
        logger.log('🗑️ 已清空所有账户', 'warning');
        el.remove();
      }
    };

    document.getElementById('cancel-accounts').onclick = () => {
      el.remove();
    };
  }

  // ==================== 10. 页面处理 ====================

  const pages = {
    // OAuth授权页面（第一页面）
    async loginIdentifier() {
      const { email } = json(GM_getValue('oauth', '{}')) || {};
      if (!email) return;

      logger.log('� 开始OAuth授权', 'info');

      const input = await waitForElement('#username');
      if (!input) return;

      // 模拟人类查看页面和理解内容的时间
      await humanLike.readingDelay(30);

      // 模拟人类输入邮箱
      logger.log('⌨️ 正在输入邮箱地址...', 'info');
      await humanLike.typeText(input, email, 40 + Math.random() * 20);
      logger.log(`📧 已输入邮箱: ${email}`, 'success');

      if (isAutoRegistering) {
        // 输入完成后的思考时间
        await humanLike.randomDelay(600, 1200);

        logger.log('🤖 检查人机验证状态...', 'info');

        if (!isAutoRegistering) return; // 检查是否已停止

        const verificationResult = await handleHumanVerification();
        if (!isAutoRegistering) return; // 检查是否已停止

        if (verificationResult) {
          // 人机验证完成后的短暂停顿
          await humanLike.randomDelay(400, 800);

          const continueBtn = await waitForElement('button[type="submit"]');
          if (continueBtn && isAutoRegistering) {
            logger.log('✅ 人机验证完成，准备点击继续...', 'success');

            // 模拟人类点击前的最后确认时间
            await humanLike.randomDelay(300, 600);
            await humanLike.clickElement(continueBtn);
            logger.log('🖱️ 已点击继续按钮', 'success');
          }
        } else {
          logger.log('❌ 人机验证失败', 'error');
        }
      }
    },

    // terms-accept页面
    async terms() {
      const { email } = json(GM_getValue('oauth', '{}')) || {};
      if (!email) return;

      logger.log('🔍 正在分析授权页面...', 'info');

      // 模拟人类阅读条款页面的时间
      await humanLike.readingDelay(60);

      let code, tenant;
      let waitTime = 12; // 增加等待时间

      for (let attempt = 0; attempt < waitTime; attempt++) {
        if (!isAutoRegistering) return; // 检查是否已停止

        logger.log(`🔍 搜索授权信息 ${attempt + 1}/${waitTime}...`, 'info');

        for (const script of document.scripts) {
          const text = script.textContent;
          if (text.includes('code:') && text.includes('tenant_url:')) {
            code = text.match(/code:\s*["']([^"']+)["']/)?.[1];
            tenant = text.match(/tenant_url:\s*["']([^"']+)["']/)?.[1];
            if (code && tenant) {
              logger.log('✅ 找到授权信息', 'success');
              break;
            }
          }
        }

        if (code && tenant) break;

        // 使用随机间隔，更像人类操作
        const waitDelay = 1200 + Math.random() * 600;
        await sleep(waitDelay);
      }

      if (!code || !tenant) {
        logger.log('❌ 未找到授权信息，跳过当前账户...', 'warning');
        currentAccountIndex++;
        saveState();
        updateUI();

        if (currentAccountIndex >= accountList.length) {
          logger.log('🎉 所有账户处理完成！', 'success');
          isAutoRegistering = false;
          saveState();
          updateUI();
          return;
        }

        // 失败后的等待时间
        await humanLike.randomDelay(2000, 3000);
        if (isAutoRegistering) {
          logger.log('🔄 开始下一个账户注册', 'info');
          oauth.start();
        }
        return;
      }

      // 获取到授权信息后的处理延迟
      await humanLike.randomDelay(400, 800);

      try {
        logger.log('🔑 正在获取访问令牌...', 'info');
        const token = await oauth.token(tenant, code);
        store.add({ tenant, token, email });
        GM_setValue('oauth', '');
        logger.log('✅ 访问令牌获取成功', 'success');

        // 跳转前的短暂停顿
        await humanLike.randomDelay(500, 1000);
        logger.log('🔄 准备跳转到订阅页面...', 'info');
        setTimeout(() => location.href = 'https://app.augmentcode.com/account/subscription', 800);
      } catch (e) {
        logger.log(`❌ 令牌获取失败: ${e}`, 'error');
      }
    },

    // subscription页面（第三页面）
    async subscription() {
      if (!isAutoRegistering) return;

      logger.log('📊 正在分析订阅页面...', 'info');

      // 模拟人类查看订阅页面的时间
      await humanLike.readingDelay(50);

      let loginiEmail, subToken;
      const maxAttempts = 15; // 增加尝试次数

      for (let i = 0; i < maxAttempts; i++) {
        if (!isAutoRegistering) return;

        logger.log(`🔍 搜索订阅信息 ${i + 1}/${maxAttempts}...`, 'info');

        loginiEmail = $('.base-header-email')?.textContent?.trim();
        const link = $('a.rt-Text.rt-Link.rt-underline-auto[target="_blank"]');
        if (link?.href) {
          try { subToken = new URL(link.href).searchParams.get('token'); } catch { }
        }

        if (loginiEmail && subToken) {
          logger.log('✅ 成功获取订阅信息', 'success');
          break;
        }

        // 使用随机间隔，更像人类操作
        const searchDelay = 400 + Math.random() * 300;
        await sleep(searchDelay);
      }

      if (!loginiEmail || !subToken) {
        logger.log('❌ 未获取到订阅信息', 'warning');
        return;
      }

      // 获取到订阅信息后的处理延迟
      await humanLike.randomDelay(500, 1000);

      const creds = store.get();
      const pending = creds.filter(c => c.email && !c.subToken).sort((a, b) => b.id - a.id)[0];
      if (pending) {
        store.update(pending.id, { subToken });
        logger.log(`✅ 第${registrationCount + 1}个账户注册完成`, 'success');

        // 增加注册计数和账户索引
        registrationCount++;
        currentAccountIndex++;
        saveState();
        updateUI();

        // 清空日志
        GM_setValue('batchRegisterLogs', '[]');

        // 检查是否还有更多账户
        if (currentAccountIndex >= accountList.length) {
          logger.log('🎉 所有账户注册完成！', 'success');
          isAutoRegistering = false;
          saveState();
          updateUI();
          return;
        }

        // 查找并点击退出登录按钮
        const logoutBtn = document.querySelector('[data-testid="logout-button"]');
        if (logoutBtn && isAutoRegistering) {
          logger.log('🚪 正在退出当前账户登录...', 'info');

          // 模拟人类点击前的短暂停顿
          await humanLike.randomDelay(500, 1000);

          // 点击退出登录
          logoutBtn.click();
          logger.log('✅ 已点击退出登录按钮', 'success');

          // 等待页面跳转后自动开始下一轮注册
          setTimeout(() => {
            if (isAutoRegistering) {
              logger.log(`🔄 开始下一个账户注册 (${currentAccountIndex + 1}/${accountList.length})`, 'info');
              GM_setValue('needContinueNextAccount', false);
              GM_setValue('nextAccountStartTime', 0);
              oauth.start();
            }
          }, 3000);
        } else {
          logger.log('⚠️ 未找到退出登录按钮，直接开始下一个账户', 'warning');

          logger.log(`🔄 准备开始下一个账户注册 (${currentAccountIndex + 1}/${accountList.length})`, 'info');

          // 账户间的休息时间，模拟人类操作间隔
          await humanLike.randomDelay(2000, 3000);

          if (isAutoRegistering) {
            logger.log('➡️ 开始下一个账户的注册流程', 'info');
            GM_setValue('needContinueNextAccount', false);
            GM_setValue('nextAccountStartTime', 0);
            oauth.start();
          }
        }
        return;
      } else {
        logger.log('未找到待配对的凭证', 'warning');
      }
    }
  };

  // 处理验证码页面
  async function handleCodePage() {
    if (!isAutoRegistering) return;

    logger.log('🔢 准备获取并输入验证码...', 'info');

    // 模拟人类阅读验证码页面说明的时间
    await humanLike.readingDelay(40);

    const code = await getVerificationCode();
    if (!code || !isAutoRegistering) return;

    // 获取验证码后的短暂停顿，模拟人类查看验证码的时间
    await humanLike.randomDelay(500, 1000);

    const codeInput = await waitForElement('input[name="code"]');
    if (!codeInput || !isAutoRegistering) return;

    // 模拟人类逐字符输入验证码
    logger.log('⌨️ 正在输入验证码...', 'info');
    await humanLike.typeText(codeInput, code, 80 + Math.random() * 40);
    logger.log(`✅ 已输入验证码: ${code}`, 'success');

    // 输入完成后的检查和确认时间
    await humanLike.randomDelay(800, 1500);

    const continueBtn = await waitForElement('button[type="submit"]');
    if (continueBtn && isAutoRegistering) {
      logger.log('🖱️ 准备提交验证码...', 'info');

      // 提交前的最后确认时间
      await humanLike.randomDelay(400, 800);
      await humanLike.clickElement(continueBtn);
      logger.log('✅ 验证码提交完成', 'success');
    }
  }

  // 处理注册被拒绝页面
  async function handleRejectedPage() {
    // 检测拒绝页面的多种可能文本
    const rejectedTexts = [
      'Sign-up rejected',
      'rejected',
      'Registration denied',
      'Account creation failed'
    ];

    // 模拟人类阅读页面内容的时间
    await humanLike.readingDelay(30);

    let rejectedElement = null;
    for (const text of rejectedTexts) {
      rejectedElement = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && el.textContent.includes(text) && el.offsetParent !== null
      );
      if (rejectedElement) {
        logger.log(`🔍 检测到拒绝页面关键词: "${text}"`, 'info');
        break;
      }
    }

    if (rejectedElement && isAutoRegistering) {
      logger.log('⚠️ 检测到注册被拒绝，准备跳过当前账户...', 'warning');

      // 模拟人类理解拒绝信息的时间
      await humanLike.randomDelay(1000, 2000);

      currentAccountIndex++;
      saveState();
      updateUI();

      if (currentAccountIndex >= accountList.length) {
        logger.log('🎉 所有账户处理完成！', 'success');
        isAutoRegistering = false;
        saveState();
        updateUI();
        return true;
      }

      // 被拒绝后的等待时间
      await humanLike.randomDelay(2000, 3000);
      if (isAutoRegistering) {
        logger.log('🔄 开始下一个账户注册', 'info');
        oauth.start();
      }
      return true;
    }
    return false;
  }

  // ==================== 11. 主函数 ====================

  async function main() {
    // 检查是否需要继续下一个账户
    const needContinue = GM_getValue('needContinueNextAccount', false);
    const startTime = GM_getValue('nextAccountStartTime', 0);

    if (needContinue && isAutoRegistering) {
      // 检查时间，避免无限循环（超过30秒就清除标记）
      if (Date.now() - startTime < 30000) {
        logger.log('🔄 检测到需要继续下一个账户，准备开始...', 'info');

        // 使用随机延迟，确保页面完全加载且更像人类操作
        const startDelay = 1500 + Math.random() * 1000;
        setTimeout(() => {
          if (isAutoRegistering) {
            logger.log('⏰ 自动开始下一个账户注册...', 'info');
            try {
              oauth.start();
            } finally {
              // 仅在尝试启动后再清除标记，避免跳转打断导致丢失
              GM_setValue('needContinueNextAccount', false);
              GM_setValue('nextAccountStartTime', 0);
            }
          }
        }, startDelay);
        return;
      } else {
        // 超时，清除标记
        GM_setValue('needContinueNextAccount', false);
        GM_setValue('nextAccountStartTime', 0);
        logger.log('⚠️ 继续下一个账户超时，已清除标记', 'warning');
      }
    }

    // 第一页面：OAuth授权页面
    if (location.href.includes('login.augmentcode.com/u/login/identifier')) {
      const loginDelay = 800 + Math.random() * 400;
      setTimeout(pages.loginIdentifier, loginDelay);
      return;
    }

    // terms-accept页面
    if (location.pathname.includes('terms-accept')) {
      const termsDelay = 1200 + Math.random() * 600;
      setTimeout(pages.terms, termsDelay);
      return;
    }

    // 第三页面：subscription页面
    if (location.href.includes('app.augmentcode.com/account/subscription')) {
      const subscriptionDelay = 1000 + Math.random() * 500;
      setTimeout(pages.subscription, subscriptionDelay);
      return;
    }

    // 注册被拒绝页面（优先检测）
    if (await handleRejectedPage()) {
      return;
    }

    // 第二页面：验证码页面
    const emailSentText = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent && el.textContent.includes("We've sent an email with your code to")
    );
    if (document.querySelector('input[name="code"]') || emailSentText) {
      if (isAutoRegistering) {
        await handleCodePage();
      }
      return;
    }

    // 其他页面
    if (!location.href.includes('augmentcode.com')) {
      logger.log('💡 点击"开始批量注册"启动注册流程', 'info');
    }
  }

  // ==================== 12. 初始化 ====================

  GM_registerMenuCommand('� 账户管理', showAccountManagement);
  GM_registerMenuCommand('�🚀 开始批量注册', startBatchRegistration);
  GM_registerMenuCommand('🔑 凭证管理', showCredentialManagement);

  logger.log('🎯 AugmentCode批量注册助手已启动 (快速人类化操作版)', 'success');
  logger.log('🤖 已启用快速人类化操作模式：阅读≤3秒、延迟优化、自然输入', 'info');

  setTimeout(() => {
    main().catch(error => logger.log('脚本执行出错: ' + error, 'error'));
  }, 1000);

})();
