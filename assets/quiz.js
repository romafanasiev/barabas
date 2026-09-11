/* Reusable retrieval-practice widget.
 *
 * Markup contract:
 *   <div class="quiz">
 *     <span class="label">Проверь себя</span>
 *     <p class="q">Вопрос?</p>
 *     <div class="options">
 *       <button data-correct>Вариант ответа один</button>
 *       <button>Вариант ответа два</button>
 *     </div>
 *     <p class="explain" hidden>Почему именно так.</p>
 *   </div>
 *
 * Rule when authoring: every option must be the same length in words and,
 * where possible, in characters. Length is a tell, and a tell kills retrieval.
 */
(function () {
  function wire(quiz) {
    var options = quiz.querySelectorAll('.options button');
    var explain = quiz.querySelector('.explain');

    options.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (quiz.dataset.answered === 'true') return;
        quiz.dataset.answered = 'true';

        options.forEach(function (other) {
          other.disabled = true;
          if (other.hasAttribute('data-correct')) other.classList.add('is-correct');
          else if (other === btn) other.classList.add('is-wrong');
        });

        if (explain) explain.hidden = false;
      });
    });
  }

  function init() {
    document.querySelectorAll('.quiz').forEach(wire);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
