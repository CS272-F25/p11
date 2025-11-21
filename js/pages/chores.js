(function () {
  const { getJSON, setJSON, escape: esc } = window.Cohabit;

  function initChoresPage() {
    const page = document.getElementById('chores-page');
    if (!page) return;

    const form = document.getElementById('chore-form');
    const list = document.getElementById('chore-list');
    const history = document.getElementById('chore-history');
    const assigneeSelect = document.getElementById('chore-assignee');
    const clearBtn = document.getElementById('clear-chores');

    // chores + roommates
    let chores = getJSON('cohabit_chores', []);
    let roommates = getJSON('cohabit_roommates', []);

    populateAssignees();
    render();

    // ----- form submit -----
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.name.value.trim();
      const assignee = form.assignee.value.trim();
      const frequency = form.frequency.value;
      const due = form.due.value;

      if (!name || !assignee || !frequency || !due) return;

      chores.push({
        id: uid(),
        name,
        assignee,
        frequency,
        due,
        done: false,
        completedAt: null
      });

      setJSON('cohabit_chores', chores);
      form.reset();
      populateAssignees(); // reset clears the select
      render();
    });

    // ----- clear completed button -----
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        chores = chores.filter(c => !c.done); // keep only incomplete
        setJSON('cohabit_chores', chores);
        render();
      });
    }

    // ===== helpers =====

    function populateAssignees() {
      if (!assigneeSelect) return;

      assigneeSelect.innerHTML = '<option value="">Choose roommate...</option>';
      roommates.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.textContent = r.name;
        assigneeSelect.appendChild(opt);
      });
    }

    function render() {
      list.innerHTML = '';

      chores.forEach(c => {
        const col = document.createElement('div');
        col.className = 'col-sm-6 col-md-4 col-lg-3';

        col.innerHTML = `
          <div class="card chore-card p-3 ${c.done ? 'done' : ''}" data-id="${c.id}">
            <h3 class="h5">${esc(c.name)}</h3>
            <p class="mb-1">
              <strong>${esc(c.assignee)}</strong>
              • ${esc(c.frequency)}
              • Due ${esc(c.due)}
            </p>
            <button class="btn btn-sm ${c.done ? 'btn-secondary' : 'btn-success'}">
              ${c.done ? 'Mark Incomplete' : 'Mark Done'}
            </button>
          </div>
        `;

        const btn = col.querySelector('button');
        btn.addEventListener('click', () => {
          const wasAllDone = chores.length > 0 && chores.every(ch => ch.done);

          c.done = !c.done;
          c.completedAt = c.done ? new Date().toISOString() : null;

          setJSON('cohabit_chores', chores);

          const isNowAllDone = chores.length > 0 && chores.every(ch => ch.done);
          if (!wasAllDone && isNowAllDone) {
            showCongrats();
          }

          render();
        });

        list.appendChild(col);
      });

      // show clear button if ANY chore is done
      const anyDone = chores.some(c => c.done);
      if (clearBtn) {
        clearBtn.classList.toggle('d-none', !anyDone);
      }

      renderHistory();
    }

    function renderHistory() {
      if (!history) return;

      const completed = chores.filter(c => c.done && c.completedAt);
      if (completed.length === 0) {
        history.textContent = 'No completed chores yet.';
        return;
      }

      const buckets = {};

      completed.forEach(c => {
        const d = new Date(c.completedAt);
        const weekStart = startOfWeek(d);
        const key = weekStart.toISOString().slice(0, 10); // YYYY-MM-DD

        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(c);
      });

      history.innerHTML = '';

      Object.keys(buckets)
        .sort((a, b) => b.localeCompare(a)) // newest week first
        .forEach(key => {
          const weekStart = new Date(key);
          const label = `Week of ${weekStart.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          })}`;

          const wrapper = document.createElement('div');
          wrapper.className = 'mb-3';

          const items = buckets[key]
            .map(c => `
              <li>
                <strong>${esc(c.name)}</strong>
                <span class="text-muted"> – ${esc(c.assignee)}</span>
              </li>
            `)
            .join('');

          wrapper.innerHTML = `
            <h3 class="h6 mb-1">${label}</h3>
            <ul class="mb-0 ps-3">
              ${items}
            </ul>
          `;

          history.appendChild(wrapper);
        });
    }

    function startOfWeek(date) {
      const d = new Date(date);
      const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
      const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday start
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function showCongrats() {
      // keep it simple: just an alert (works everywhere)
      alert('🎉 All chores completed! Great job keeping the place running.');
    }
  }

  function uid() {
    return (window.Cohabit && window.Cohabit.uid)
      ? window.Cohabit.uid()
      : Math.random().toString(36).slice(2, 10);
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initChoresPage = initChoresPage;
})();
