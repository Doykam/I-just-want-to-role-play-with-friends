/* =========================================================================
   script.js
   ไฟล์นี้มีแต่ "logic" การทำงาน — ไม่มีข้อมูลบ้าน/พื้นที่/ของอยู่ในนี้เลย
   ตัวแปร HOUSES, ITEM_LIBRARY, AREAS ถูกประกาศไว้ใน data.js
   เพราะ index.html โหลด data.js ไว้ก่อน script.js ตัวแปรเหล่านั้นเลยใช้ได้เลยตรงนี้
   (ถ้าสลับลำดับ <script> ใน index.html จะพัง เพราะตัวแปรยังไม่ถูกสร้าง)
   ========================================================================= */


/* -------------------------------------------------------------------------
   STORAGE — ที่เก็บ/อ่านข้อมูลประวัติการสำรวจ
   ตอนนี้ใช้ localStorage (เก็บเฉพาะเบราว์เซอร์ตัวเอง) เพื่อทดสอบ logic ก่อน
   ถ้าจะย้ายไป Firebase ทีหลัง แก้แค่ 2 ฟังก์ชันนี้ให้เป็น async อ่าน/เขียน Firestore
   ส่วน logic ด้านล่างทั้งหมดไม่ต้องแก้เลย
------------------------------------------------------------------------- */
const STORE_KEY = "wtm_explore_history_v1";

function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch(e){ return []; }
}
function saveHistory(list){
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

// ไอเทมหายากที่ "ถูกเอาไปแล้ว" คำนวณจากประวัติทั้งหมด (ใครก็ตามที่เคยได้)
function claimedRareItems(){
  const h = loadHistory();
  const claimed = new Set();
  h.forEach(e=>{
    if(ITEM_LIBRARY[e.itemKey] && ITEM_LIBRARY[e.itemKey].rare){
      claimed.add(e.itemKey);
    }
  });
  return claimed;
}


/* -------------------------------------------------------------------------
   เติมตัวเลือกลง dropdown ตอนโหลดหน้าเว็บ (อ่านจาก HOUSES / AREAS ใน data.js)
------------------------------------------------------------------------- */
const houseSel = document.getElementById('charHouse');
HOUSES.forEach(h=>{
  const o = document.createElement('option'); o.value=h; o.textContent=h; houseSel.appendChild(o);
});
const areaSel = document.getElementById('charArea');
AREAS.forEach(a=>{
  const o = document.createElement('option'); o.value=a.id; o.textContent=a.name; areaSel.appendChild(o);
});


/* -------------------------------------------------------------------------
   สลับแท็บ HOME / HISTORY / ITEMS
------------------------------------------------------------------------- */
document.querySelectorAll('.navlinks button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.navlinks button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['home','history','items'].forEach(t=>{
      document.getElementById('tab-'+t).style.display = (t===btn.dataset.tab) ? 'block' : 'none';
    });
    if(btn.dataset.tab==='history') renderHistory();
    if(btn.dataset.tab==='items') renderItems();
  });
});


/* -------------------------------------------------------------------------
   ปุ่ม "เริ่มสำรวจ" — สุ่มครั้งเดียวจบ ไม่มีสุ่มซ้ำ
------------------------------------------------------------------------- */
document.getElementById('exploreBtn').addEventListener('click', ()=>{
  const name = document.getElementById('charName').value.trim();
  const house = houseSel.value;
  const areaId = areaSel.value;
  const warnBox = document.getElementById('warnBox');
  warnBox.innerHTML = '';

  if(!name || !house || !areaId){
    warnBox.innerHTML = `<div class="warn">กรุณากรอกชื่อตัวละคร เลือกบ้าน และเลือกพื้นที่ให้ครบก่อนสำรวจ</div>`;
    return;
  }

  const area = AREAS.find(a=>a.id===areaId);
  const claimed = claimedRareItems();

  // พูลที่สุ่มได้จริง = ของทั่วไปทั้งหมด + ของหายากที่ "ยังไม่มีใครเอาไป"
  const availablePool = area.pool.filter(key=>{
    const item = ITEM_LIBRARY[key];
    if(!item.rare) return true;          // ของทั่วไป สุ่มได้เสมอ
    return !claimed.has(key);            // ของหายาก ต้องยังไม่มีใครได้
  });

  if(availablePool.length === 0){
    warnBox.innerHTML = `<div class="warn">พื้นที่นี้ไม่มีของเหลือให้สำรวจแล้ว (ของหายากถูกเก็บไปหมดแล้ว)</div>`;
    return;
  }

  const itemKey = availablePool[Math.floor(Math.random()*availablePool.length)];
  const item = ITEM_LIBRARY[itemKey];

  // บันทึกผลลงประวัติทันที (ไม่มีปุ่มยืนยันแยก เพราะสุ่มครั้งเดียวจบ)
  const h = loadHistory();
  h.unshift({
    character:name, house, areaId, areaName:area.name,
    itemKey, itemName:item.name, rare:item.rare, ts:Date.now()
  });
  saveHistory(h);

  renderResult(area, item);
});

function renderResult(area, item){
  document.getElementById('resultBox').innerHTML = `
    <div class="result">
      <div class="item-icon">
        ${item.icon}
        ${item.rare ? '<span class="rare-badge">ของหายาก</span>' : ''}
      </div>
      <div>
        <div class="tag">ผลการสำรวจ · ${area.name}</div>
        <h3>คุณเจอกับ...</h3>
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.desc}</div>
        ${item.rare
          ? `<div class="item-note">ของชิ้นนี้มีเพียงชิ้นเดียว — จะไม่มีใครสุ่มเจอมันได้อีก</div>`
          : `<div class="item-note" style="color:#8a8577;">ของทั่วไป — คนอื่นยังมีโอกาสสุ่มเจอได้อีก</div>`}
      </div>
    </div>
  `;
}


/* -------------------------------------------------------------------------
   แท็บ History — ตารางประวัติทั้งหมด ค้นหาได้
------------------------------------------------------------------------- */
function renderHistory(){
  const wrap = document.getElementById('historyTableWrap');
  const q = (document.getElementById('historySearch').value || '').trim().toLowerCase();
  const h = loadHistory().filter(e => e.character.toLowerCase().includes(q));

  if(h.length === 0){
    wrap.innerHTML = `<div class="empty">ยังไม่มีประวัติการสำรวจ${q ? ' ที่ตรงกับคำค้นหา' : ''}</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>ตัวละคร</th><th>บ้าน</th><th>พื้นที่</th><th>สิ่งที่พบ</th></tr></thead>
      <tbody>
        ${h.map(e=>`
          <tr>
            <td>${e.character}</td>
            <td>${e.house}</td>
            <td>${e.areaName}</td>
            <td>${e.itemName}${e.rare ? '<span class="badge-rare">หายาก</span>' : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
document.getElementById('historySearch').addEventListener('input', renderHistory);


/* -------------------------------------------------------------------------
   แท็บ Items — โชว์สถานะของทุกชิ้น (เหลือ/ถูกเก็บไปแล้วโดยใคร)
------------------------------------------------------------------------- */
function renderItems(){
  const grid = document.getElementById('itemsGrid');
  const h = loadHistory();

  grid.innerHTML = Object.keys(ITEM_LIBRARY).map(key=>{
    const item = ITEM_LIBRARY[key];
    if(item.rare){
      const takenBy = h.filter(e=>e.itemKey===key).sort((a,b)=>a.ts-b.ts)[0];
      return `
        <div class="icard ${takenBy?'claimed':''}">
          <div class="ic">${item.icon}</div>
          <div class="iname">${item.name}</div>
          <div class="istatus ${takenBy?'gone':'avail'}">
            ${takenBy ? `ถูกเก็บไปแล้วโดย ${takenBy.character}` : 'ยังไม่มีใครเจอ (เหลืออยู่)'}
          </div>
        </div>
      `;
    } else {
      const count = h.filter(e=>e.itemKey===key).length;
      return `
        <div class="icard">
          <div class="ic">${item.icon}</div>
          <div class="iname">${item.name}</div>
          <div class="istatus common">${count>0 ? `ถูกเจอแล้ว ${count} ครั้ง` : 'ยังไม่เคยถูกเจอ'}</div>
        </div>
      `;
    }
  }).join('');
}
