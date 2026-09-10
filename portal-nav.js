(() => {
  const style = document.createElement('style');
  style.textContent = `
    .playroom-home-button {
      position: fixed;
      top: max(14px, env(safe-area-inset-top));
      left: max(14px, env(safe-area-inset-left));
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 16px;
      border: 2px solid rgba(255,255,255,.9);
      border-radius: 999px;
      background: rgba(17,19,24,.92);
      color: #fff;
      box-shadow: 0 6px 20px rgba(0,0,0,.28);
      font: 800 13px/1.2 system-ui, -apple-system, "Noto Sans JP", sans-serif;
      text-decoration: none;
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      transition: transform .18s, background .18s;
    }
    .playroom-home-button:hover { background:#242832; transform:translateY(-2px); }
    .playroom-home-button:active { transform:translateY(1px); }
    .playroom-home-button:focus-visible { outline:4px solid #d8ff4f; outline-offset:3px; }
    @media (max-width:520px) {
      .playroom-home-button { padding:9px 13px; font-size:12px; }
    }
  `;

  const link = document.createElement('a');
  link.className = 'playroom-home-button';
  link.href = '../../index.html';
  link.setAttribute('aria-label', 'PLAYROOMのゲーム一覧へ戻る');
  link.innerHTML = '<span aria-hidden="true">←</span><span>PLAYROOMへ戻る</span>';

  document.head.appendChild(style);
  document.body.appendChild(link);
})();
