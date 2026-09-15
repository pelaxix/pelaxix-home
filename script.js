const projects = [...document.querySelectorAll('.project-card'), ...document.querySelectorAll('.feature-card')];

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.project-card').forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      card.classList.toggle('hidden', filter !== 'all' && !categories.includes(filter));
    });
  });
});

document.getElementById('random-project')?.addEventListener('click', () => {
  const choices = projects.filter(project => project.getAttribute('href'));
  if (!choices.length) return;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  window.location.href = pick.getAttribute('href');
});

document.getElementById('year').textContent = new Date().getFullYear();
