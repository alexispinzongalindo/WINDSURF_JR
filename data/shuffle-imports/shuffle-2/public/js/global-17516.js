(function() {
  const init = () => {
    const navbarBurgers = document.querySelectorAll('.navbar-burger');
    const navbarCloses = document.querySelectorAll('.navbar-close');
    const navbarMenus = document.querySelectorAll('.navbar-menu');
    
    navbarBurgers.forEach(burger => {
      burger.addEventListener('click', () => {
        navbarMenus.forEach(menu => {
          menu.classList.toggle('hidden');
        });
      });
    });
    
    navbarCloses.forEach(close => {
      close.addEventListener('click', () => {
        navbarMenus.forEach(menu => {
          menu.classList.add('hidden');
        });
      });
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }
      });
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();