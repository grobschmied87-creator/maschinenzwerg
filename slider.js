// Simple image slider
function initSlider(containerId, images) {
  const container = document.getElementById(containerId);
  if (!container || !images.length) return;

  container.innerHTML = `
    <div class="slider" id="${containerId}-slider">
      ${images.map((src, i) => `<img src="${src}" class="${i===0?'active':''}" alt="">`).join('')}
      <div class="slider-dots">
        ${images.map((_, i) => `<span class="${i===0?'active':''}" data-i="${i}"></span>`).join('')}
      </div>
    </div>
  `;

  const slider = container.querySelector('.slider');
  const imgs = slider.querySelectorAll('img');
  const dots = slider.querySelectorAll('.slider-dots span');
  let current = 0;

  function show(n) {
    imgs.forEach(img => img.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    current = (n + imgs.length) % imgs.length;
    imgs[current].classList.add('active');
    dots[current].classList.add('active');
  }

  dots.forEach(d => d.addEventListener('click', () => show(+d.dataset.i)));

  setInterval(() => show(current + 1), 3500);
}
