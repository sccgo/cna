/**
 * CNA Enhanced Quill — Audio/Video/Image upload blots
 * Offline-capable — no CDN dependencies
 */
(function () {
  if (typeof Quill === 'undefined') return;

  const BlockEmbed = Quill.import('blots/block/embed');

  // ── Audio blot ─────────────────────────────────────────
  class AudioBlot extends BlockEmbed {
    static create(src) {
      const node = super.create();
      node.setAttribute('src', src);
      node.setAttribute('controls', true);
      node.setAttribute('preload', 'metadata');
      node.style.cssText = 'width:100%;margin:1rem 0;display:block;outline:1px solid #e5e5e5;';
      return node;
    }
    static value(node) { return node.getAttribute('src'); }
  }
  AudioBlot.blotName = 'audio';
  AudioBlot.tagName  = 'audio';
  Quill.register(AudioBlot, true);

  // ── Local video blot ────────────────────────────────────
  class LocalVideoBlot extends BlockEmbed {
    static create(src) {
      const node = super.create();
      node.setAttribute('src', src);
      node.setAttribute('controls', true);
      node.setAttribute('preload', 'metadata');
      node.style.cssText = 'width:100%;margin:1rem 0;display:block;outline:1px solid #e5e5e5;max-height:480px;';
      return node;
    }
    static value(node) { return node.getAttribute('src'); }
  }
  LocalVideoBlot.blotName = 'localvideo';
  LocalVideoBlot.tagName  = 'video';
  Quill.register(LocalVideoBlot, true);

  // ── Toolbar icons ────────────────────────────────────────
  const icons = Quill.import('ui/icons');
  icons['audio'] = `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3a1 1 0 00-1.6-.8L3.7 4H2a1 1 0 00-1 1v4a1 1 0 001 1h1.7l2.7 1.8A1 1 0 008 11V3z"/><path d="M15 6a4 4 0 010 4.7"/><path d="M12.5 7.5a2 2 0 010 2.3"/></svg>`;
  icons['localvideo'] = `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="12" height="12" rx="1.5"/><path d="M13 7l4-2v8l-4-2"/></svg>`;

  // ── Upload helper ────────────────────────────────────────
  async function uploadToServer(file) {
    const fd = new FormData();
    fd.append('file', file);
    let type = 'image';
    if (file.type.startsWith('audio/')) type = 'media';
    else if (file.type.startsWith('video/')) type = 'media';
    fd.append('type', type);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'فشل الرفع'); }
    return res.json();
  }

  function pickAndUpload(quill, accept, blotType) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const range = quill.getSelection(true);
      quill.insertText(range.index, '⌛ جاري الرفع...', { color: '#a3a3a3' });
      try {
        const data = await uploadToServer(file);
        quill.deleteText(range.index, '⌛ جاري الرفع...'.length);
        const bt = data.kind === 'audio' ? 'audio' : data.kind === 'video' ? 'localvideo' : 'image';
        quill.insertEmbed(range.index, bt, data.url);
        quill.setSelection(range.index + 1);
      } catch (e) {
        quill.deleteText(range.index, '⌛ جاري الرفع...'.length);
        alert('خطأ في الرفع: ' + e.message);
      }
    };
    input.click();
  }

  // ── Register toolbar handlers on any Quill instance ─────
  const _originalInit = Quill.prototype.init || function () {};
  const _origQuill = Quill;

  // Patch: after Quill is created with snow theme, register handlers
  window.__cnaRegisterQuillHandlers = function (quill) {
    const toolbar = quill.getModule('toolbar');
    if (!toolbar) return;
    toolbar.addHandler('audio',      () => pickAndUpload(quill, 'audio/*', 'audio'));
    toolbar.addHandler('localvideo', () => pickAndUpload(quill, 'video/*', 'localvideo'));
    toolbar.addHandler('image', () => {
      // Override default image handler to upload to server
      pickAndUpload(quill, 'image/*,audio/*,video/*', 'image');
    });

    // Drag-and-drop into editor
    quill.root.addEventListener('drop', async (e) => {
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      e.preventDefault(); e.stopPropagation();
      let index = quill.getSelection()?.index ?? quill.getLength();
      for (const file of files) {
        if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
          try {
            const data = await uploadToServer(file);
            const bt = data.kind === 'audio' ? 'audio' : data.kind === 'video' ? 'localvideo' : 'image';
            quill.insertEmbed(index, bt, data.url);
            index++;
          } catch (err) { console.error(err); }
        }
      }
    });
  };

  console.log('[CNA] Quill enhanced blots registered');
})();
