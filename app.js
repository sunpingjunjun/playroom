const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.game-card');
const emptyMessage = document.querySelector('.empty-message');

filters.forEach((button) => {
  button.addEventListener('click', () => {
    filters.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const selected = button.dataset.filter;
    let visible = 0;

    cards.forEach((card) => {
      const show = selected === 'all' || card.dataset.category === selected;
      card.hidden = !show;
      if (show) visible += 1;
    });

    emptyMessage.hidden = visible !== 0;
  });
});
