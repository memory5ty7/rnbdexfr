window.PokemonDico = window.AddOnDictionaries.PokemonDico || {};
window.AbilityDico = window.AddOnDictionaries.AbilityDico || {};
window.MoveDico = window.AddOnDictionaries.MoveDico || {};
window.ItemDico = window.AddOnDictionaries.ItemDico || {};
window.MovesLongDescDico = window.AddOnDictionaries.MovesLongDescDico || {};
window.ItemsLongDescDico = window.AddOnDictionaries.ItemsLongDescDico || {};
window.AbilitiesShortDescDico = window.AddOnDictionaries.AbilitiesShortDescDico || {};
window.MovesShortDescDico = window.AddOnDictionaries.MovesShortDescDico || {};
window.MoveEffectDico = window.AddOnDictionaries.MoveEffectDico || {};

function walk(node) {
  let child, next;

  switch (node.nodeType) {
    case 1:
    case 9:
    case 11:
      child = node.firstChild;
      while (child) {
        next = child.nextSibling;
        walk(child);
        child = next;
      }
      break;
    case 3:
      handleText(node);
      break;
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyDictionary(text, dict) {
  return dict[text] || text;
}

function getApplicableDict(textNode) {
  let node = textNode;
  while (node) {
    if (node.nodeName === "A" && node.hasAttribute("href")) {
      const href = node.getAttribute("href");
      if (href.startsWith("/pokemon/")) return PokemonDico;
      if (href.startsWith("/items/")) return ItemDico;
      if (href.startsWith("/moves/")) return MoveDico;
      if (href.startsWith("/abilities/")) return AbilityDico;
    }
    if (node.nodeName === "SPAN") {
      if (node.classList.contains("pokemon-name")) return PokemonDico;
      if (node.classList.contains("item-name")) return ItemDico;
      if (node.classList.contains("move-name")) return MoveDico;
      if (node.classList.contains("abilitycol") || node.classList.contains("twoabilitycol")) return AbilityDico;
    }
    node = node.parentNode;
  }
  return "";
}

function translateDescriptions(root = document) {
  const types = [
    {
      prefix: "/moves/",
      dict: MovesShortDescDico,
      descClass: ".movedesccol"
    },
    {
      prefix: "/items/",
      dict: ItemsLongDescDico,
      descClass: ".itemdesccol"
    },
    {
      prefix: "/abilities/",
      dict: AbilitiesShortDescDico,
      descClass: ".abilitydesccol"
    }
  ];

  types.forEach(({ prefix, dict, descClass }) => {
    (root.querySelectorAll ? root.querySelectorAll(`a[href^='${prefix}']`) : []).forEach(link => {
      const dataEntry = link.getAttribute("data-entry");
      if (!dataEntry) return;

      const parts = dataEntry.split("|");
      if (parts.length !== 2) return;

      const name = parts[1].trim();
      const descSpan = link.querySelector(descClass);
      if (!descSpan) return;

      if (dict[name] && descSpan.textContent !== dict[name]) {
        descSpan.textContent = dict[name];
      }
    });
  });
}

function translateByDictionary(root, selector, dictionary) {
  if (!root) return;
  const links = root.querySelectorAll(selector);
  links.forEach(a => {
    const name = a.textContent.trim();
    const translated = dictionary[name];

    if (translated) {
      let container = a.closest('h1') || a.parentElement;
      if (!container) return;

      let p = container.nextElementSibling;
      if (!p || p.tagName.toLowerCase() !== 'p') {
        p = container.parentElement?.querySelector('p');
      }

      if (p && p.tagName.toLowerCase() === 'p') {
        p.textContent = translated;
      } else {
        console.warn('No <p> found near', a);
      }
    }
  });
}

function translateParagraphs(root) {
  translateByDictionary(root, 'h1 a', ItemsLongDescDico);
  translateByDictionary(root, 'h1 a', MovesLongDescDico);
  translateByDictionary(root, 'h1 a', AbilitiesShortDescDico);
}

function translateTagDescriptions(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

  const tagLinks = root.querySelectorAll('a[href^="/tags/"]');

  tagLinks.forEach(link => {
    const tagNameRaw = link.textContent.trim();
    
    const newTagText = MoveEffectDico[tagNameRaw];
    
    if (newTagText) {
      link.textContent = newTagText;
    }

    const container = link.closest('p.movetag');
    const small = container?.querySelector('small');
    if (small && MoveEffectDico[small.textContent]) {
      small.textContent = MoveEffectDico[small.textContent];
    }
  });
}

function translateNode(node) {
  if (node.nodeType === 3) {  // Text node
    const dict = getApplicableDict(node);
    const original = node.nodeValue;
    const translated = applyDictionary(original, dict);
    if (translated !== original) {
      node.nodeValue = translated;
    }
  } else if (node.nodeType === 1 && !node.hasAttribute("data-translated")) {
    node.childNodes.forEach(translateNode);
  }
}

function observeAndTranslate(root = document.body) {
  translateTagDescriptions(root);
  translateDescriptions(root);
  translateParagraphs(root);
  translateNode(root);
  
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        translateTagDescriptions(node);
        translateDescriptions(node);
        translateParagraphs(root);
        translateNode(node);
      });
    });
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });
}

function enableLiveInputTranslation() {
  function attachListener(input) {
    if (!input._liveTranslationAttached) {
      input._liveTranslationAttached = true;

      const mergedDict = {
        ...PokemonDico,
        ...AbilityDico,
        ...MoveDico,
        ...ItemDico
      };

      const ReversedGlobalDico = Object.fromEntries(
        Object.entries(mergedDict).map(([en, fr]) => [fr.toLowerCase(), en])
      );

      const sortedFrenchKeys = Object.keys(ReversedGlobalDico).sort((a, b) => b.length - a.length);

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

      const letters = 'a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ';

      input.addEventListener('input', () => {
        const caret = input.selectionStart;
        let text = input.value;
        let changed = false;

        for (const frTerm of sortedFrenchKeys) {
          const escaped = escapeRegex(frTerm);
          const regex = new RegExp(`(^|[^${letters}])(${escaped})(?=[^${letters}]|$)`, 'gi');

          text = text.replace(regex, (match, prefix, word) => {
            const replacement = ReversedGlobalDico[word.toLowerCase()];
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
  }

  let input = document.querySelector('.searchboxwrapper .searchbox');
  if (input) attachListener(input);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      const newInput = document.querySelector('.searchboxwrapper .searchbox');
      if (newInput) attachListener(newInput);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

observeAndTranslate();
enableLiveInputTranslation();