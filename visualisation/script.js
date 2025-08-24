// Populate compare selects
const cards = document.querySelectorAll('.planet-card');
const select1 = document.getElementById('compareSelect1');
const select2 = document.getElementById('compareSelect2');

cards.forEach(card => {
  const name = card.querySelector('h4').textContent;
  const option1 = document.createElement('option');
  option1.value = name;
  option1.textContent = name;
  select1.appendChild(option1);

  const option2 = document.createElement('option');
  option2.value = name;
  option2.textContent = name;
  select2.appendChild(option2);
});

// Search function
function searchPlanet() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  cards.forEach(card => {
    const name = card.querySelector('h4').textContent.toLowerCase();
    if(name.includes(input) && input !== "") {
      card.style.display = '';
      card.classList.add('search-match'); // glow red
    } else {
      card.classList.remove('search-match'); // remove glow
      card.style.display = name.includes(input) ? '' : 'none';
    }
  });
}

// Filter by distance
function filterDistance() {
  const filter = document.getElementById('distanceFilter').value;
  cards.forEach(card => {
    const category = card.dataset.category;
    if(filter === "all") card.style.display = '';
    else card.style.display = (category === filter) ? '' : 'none';
  });
}

// Compare function
function comparePlanets() {
  const p1 = select1.value;
  const p2 = select2.value;
  if(!p1 || !p2) {
    alert("Select both planets to compare!");
    return;
  }
  if(p1 === p2) {
    alert("Select two different planets!");
    return;
  }
  const planet1 = Array.from(cards).find(c => c.querySelector('h4').textContent === p1);
  const planet2 = Array.from(cards).find(c => c.querySelector('h4').textContent === p2);
  const dist1 = planet1.dataset.distance;
  const dist2 = planet2.dataset.distance;

  const compareText = `${p1} is ${dist1} pc away and ${p2} is ${dist2} pc away.`;
  const compareSection = document.getElementById('compareSection');
  document.getElementById('compareResult').textContent = compareText;
  compareSection.style.display = 'block';
}
