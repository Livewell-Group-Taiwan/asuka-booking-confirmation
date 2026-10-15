/* 員工登入：用 CRM 後台那組帳號（跟 asukabefore、pdfjp 的 staff.js 同一個樣子）。
 *
 * 沒登入 → 蓋一層登入框在整頁上面；登入了 → 頂欄右邊放「名字 · 登出」。
 *
 * ⚠️ 這支是純靜態網頁，伺服器上沒有任何資料（資料都在瀏覽器裡），所以這道門
 * 只是讓介面跟其他工具一致、擋掉閒人，**不是在保護資料**。
 * 帳密由 nginx 轉給 CRM（見 nginx.conf 的 /api/staff/*），token 放 localStorage，
 * 打 /api/staff/me 時用 Bearer 帶上。
 */
(function () {
  var KEY = 'asukainvoice_staff_token';
  function tok() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setTok(t) { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch (e) {} }

  var css = [
    /* 頂欄是深藍底，所以登出鈕用白框白字（跟旁邊那排按鈕同一個樣子） */
    '.staff-pill{margin-left:8px;flex-shrink:0;font:500 12.5px inherit;color:#FFFFFF;',
    'background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap}',
    '.staff-pill:hover{background:rgba(255,255,255,.12)}',
    '.staff-veil{position:fixed;inset:0;z-index:1000;background:var(--cream,#F7F7F7);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.staff-card{background:#fff;border:1px solid var(--lw-border,#E2E2E2);border-radius:14px;box-shadow:0 8px 24px rgba(11,31,58,.06);',
    'width:100%;max-width:360px;padding:32px;font-family:var(--font-sans,sans-serif);color:var(--lw-navy,#0B1F3A)}',
    '.staff-card .brandword{text-align:center;font-weight:700;letter-spacing:.22em;color:var(--navy,#0B1F3A);margin:0 0 4px}',
    '.staff-card .sub{text-align:center;font-size:13px;color:var(--lw-gray,#4A5563);margin:0 0 18px}',
    '.staff-card .note{font-size:13px;color:var(--lw-gray,#4A5563);margin:0 0 16px;line-height:1.6}',
    '.staff-card label{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}',
    '.staff-card input{width:100%;box-sizing:border-box;border:1px solid var(--lw-border,#E2E2E2);border-radius:8px;padding:10px 12px;font-size:15px}',
    '.staff-card button{width:100%;margin-top:18px;border:0;border-radius:8px;padding:11px;font-size:15px;font-weight:600;color:#fff;',
    'background:var(--royal,#004DB3);cursor:pointer}',
    '.staff-card button[disabled]{opacity:.6;cursor:default}',
    '.staff-card .err{color:#B42318;font-size:13px;margin:12px 0 0;min-height:1em}',
    '.staff-card .foot{text-align:center;font-size:12px;color:var(--lw-gray,#4A5563);margin:16px 0 0}',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function veil(message) {
    var v = document.createElement('div');
    v.className = 'staff-veil';
    v.innerHTML =
      '<form class="staff-card" autocomplete="on">' +
      '<p class="brandword">LIVEWELL TRAVEL</p>' +
      '<p class="sub">ASUKA 訂位確認生成器</p>' +
      '<p class="note">用 CRM 後台的帳號登入（跟 members.livewellgroup.com.tw/admin 同一組）。</p>' +
      '<label for="staff-email">Email</label><input id="staff-email" type="email" autocomplete="username" required>' +
      '<label for="staff-password">密碼</label><input id="staff-password" type="password" autocomplete="current-password" required>' +
      '<p class="err" role="alert"></p>' +
      '<button type="submit">登入</button>' +
      '<p class="foot">忘記密碼請到 <a href="https://members.livewellgroup.com.tw/admin/login" target="_blank" rel="noreferrer">CRM 後台</a> 重設。</p>' +
      '</form>';
    var form = v.querySelector('form');
    var err = v.querySelector('.err');
    var btn = v.querySelector('button');
    if (message) err.textContent = message;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v.querySelector('#staff-email').value.trim(), password: v.querySelector('#staff-password').value }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) {
          if (r.ok && b.token) { setTok(b.token); location.reload(); return; }
          if (r.status === 401) { err.textContent = '帳號或密碼不正確'; btn.disabled = false; return; }
          err.textContent = b.error || ('登入失敗（' + r.status + '）');
          btn.disabled = false;
        });
      }).catch(function () {
        err.textContent = '帳號系統暫時連不上，請稍後再試。';
        btn.disabled = false;
      });
    });
    document.body.appendChild(v);
    v.querySelector('#staff-email').focus();
  }

  function pill(staff) {
    var bar = document.querySelector('header.topbar');
    if (!bar) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'staff-pill';
    b.title = staff.email;
    b.textContent = (staff.name || staff.email) + ' · 登出';
    b.addEventListener('click', function () {
      // 登出就重新載入，不在原地清狀態（landing 10-14 踩過：原地清的話按了像沒反應）
      var t = tok();
      setTok(null);
      fetch('/api/staff/logout', { method: 'POST', keepalive: true, headers: t ? { Authorization: 'Bearer ' + t } : {} })
        .catch(function () {})
        .then(function () { location.reload(); });
    });
    bar.appendChild(b);
  }

  function start() {
    var t = tok();
    if (!t) { veil(); return; }
    fetch('/api/staff/me', { headers: { Authorization: 'Bearer ' + t } }).then(function (r) {
      if (r.ok) return r.json().then(function (u) {
        if (u && (u.role === 'admin' || u.role === 'owner')) pill(u); else { setTok(null); veil(); }
      });
      if (r.status === 401 || r.status === 403) setTok(null);
      if (r.status === 503) return veil('帳號系統暫時連不上，請稍後再試。');
      veil();
    }).catch(function () { veil('帳號系統暫時連不上，請稍後再試。'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
