window.PokemonDico = window.AddOnDictionaries.PokemonDico || {};
window.AbilityDico = window.AddOnDictionaries.AbilityDico || {};
window.MoveDico = window.AddOnDictionaries.MoveDico || {};
window.ItemDico = window.AddOnDictionaries.ItemDico || {};
window.CalcButtons = window.AddOnDictionaries.CalcButtons || {};

const targetIDs = [
  "resultMoveR1", "resultMoveR2", "resultMoveR3", "resultMoveR4",
  "resultMoveL1", "resultMoveL2", "resultMoveL3", "resultMoveL4"
];

function translateElements(selector, getNameFn, setTextFn, dict) {
  document.querySelectorAll(selector).forEach(el => {
    const name = getNameFn(el);
    const translated = dict[name];
    if (translated && translated !== name) {
      setTextFn(el, translated);
    }
  });
}

function translateLabels() {
  for (const id of targetIDs) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      const original = label.textContent.trim();
      const translated = MoveDico[original];
      if (translated && label.textContent !== translated) {
        label.textContent = translated;
      }
    }
  }

translateElements(
  'span.select2-chosen',
  el => {
    const text = el.textContent.trim();
    const match = text.match(/^([^\s(]+)/);
    return match ? match[1] : null;
  },
  (el, translated) => {
    const original = el.textContent.trim();
    const match = original.match(/^([^\s(]+)/);
    if (match) {
      el.textContent = translated + original.slice(match[1].length);
    }
  },
  PokemonDico
);

translateElements(
  'div.select2-result-label > b',
  el => el.textContent.trim(),
  (el, translated) => { el.textContent = translated; },
  PokemonDico
);
}
setInterval(translateLabels, 500);

const mergedDict = {
  ...MoveDico,
  ...ItemDico,
  ...AbilityDico
};

function translateOptions() {
  document.querySelectorAll('option').forEach(option => {
    const text = option.textContent.trim();
    const translated = mergedDict[text];
    if (translated && option.textContent !== translated) {
      option.textContent = translated;
    }
  });
}

translateOptions();

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;

      if (node.tagName === "OPTION") {
        const text = node.textContent.trim();
        const translated = mergedDict[text];
        if (translated) node.textContent = translated;
      }

      const options = node.querySelectorAll?.("option");
      options?.forEach(option => {
        const text = option.textContent.trim();
        const translated = mergedDict[text];
        if (translated) option.textContent = translated;
      });
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

function translateBtnLabelsOnce() {
  document.querySelectorAll('label[class^="btn"]').forEach(label => {
    const originalText = label.textContent.trim();
    const translated = CalcButtons[originalText];
    if (translated && label.textContent !== translated) {
      label.textContent = translated;
    }
  });
}

translateBtnLabelsOnce();

function enableLiveInputTranslation() {
  const reversedDict = Object.fromEntries(
    Object.entries(PokemonDico).map(([en, fr]) => [fr.toLowerCase(), en])
  );

  const sortedFrenchKeys = Object.keys(reversedDict).sort((a, b) => b.length - a.length);

  const letters = 'a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ';

  function escapeRegex(text) {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  function matchCasing(original, replacement) {
    if (original === original.toUpperCase()) return replacement.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
    }
    return replacement.toLowerCase();
  }

  function attach(input) {
    if (!input || input._liveTranslationAttached) return;
    input._liveTranslationAttached = true;

    input.addEventListener('input', () => {
      const caret = input.selectionStart;
      let text = input.value;
      let changed = false;

      for (const frTerm of sortedFrenchKeys) {
        const escaped = escapeRegex(frTerm);
        const regex = new RegExp(`(^|[^${letters}])(${escaped})(?=[^${letters}]|$)`, 'gi');

        text = text.replace(regex, (match, prefix, word) => {
          const replacement = reversedDict[word.toLowerCase()];
          if (!replacement) return match;
          changed = true;
          return prefix + matchCasing(word, replacement);
        });
      }

      if (changed) {
        input.value = text;
        input.setSelectionRange(caret, caret);
      }
    });
  }

  document.querySelectorAll('.select2-search .select2-input').forEach(attach);

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.select2-search .select2-input').forEach(attach);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

enableLiveInputTranslation();

window.addEventListener('load', () => {
  const creditsDiv = document.querySelector('.credits');
  if (!creditsDiv) return;

  const originalText = "Modification by ForwardFeed Originaly Created by Honko, maintained by Austin and Kris, Special thanks to Hzla";
  const translationNote = " — Traduit par Memory5ty7";

  if (!creditsDiv.textContent.includes(translationNote.trim())) {
    for (const node of creditsDiv.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(originalText)) {
        node.textContent = node.textContent.trim() + translationNote;
        break;
      }
    }
  }
});