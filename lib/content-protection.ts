"use client"

/**
 * Sistema de Proteção de Conteúdo
 * Previne screenshots, prints e capturas de tela
 */

export class ContentProtection {
  private static instance: ContentProtection
  private isProtectionActive = false

  private constructor() {}

  static getInstance(): ContentProtection {
    if (!ContentProtection.instance) {
      ContentProtection.instance = new ContentProtection()
    }
    return ContentProtection.instance
  }

  /**
   * Ativa todas as proteções
   */
  activate() {
    if (this.isProtectionActive) return
    this.isProtectionActive = true

    this.preventRightClick()
    this.preventKeyboardShortcuts()
    this.preventTextSelection()

    console.log("[ContentProtection] Proteção ativada")
  }

  /**
   * Desativa todas as proteções
   */
  deactivate() {
    if (!this.isProtectionActive) return
    this.isProtectionActive = false

    console.log("[ContentProtection] Proteção desativada")
  }

  /**
   * Previne clique direito
   */
  private preventRightClick() {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      return false
    })
  }

  /**
   * Previne atalhos de teclado para screenshot
   */
  private preventKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault()
        return false
      }

      // Cmd/Ctrl + Shift + 3/4/5 (Mac screenshots)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault()
        return false
      }

      // Windows Snipping Tool (Win + Shift + S)
      if (e.key === "s" && e.shiftKey && e.metaKey) {
        e.preventDefault()
        return false
      }

      // Ctrl/Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault()
        return false
      }

      // Ctrl/Cmd + S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        return false
      }

      // F12, Ctrl+Shift+I, Ctrl+Shift+J (DevTools)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C"))
      ) {
        e.preventDefault()
        return false
      }
    })
  }

  /**
   * Previne seleção de texto e drag de imagens
   */
  private preventTextSelection() {
    const style = document.createElement("style")
    style.textContent = `
      .protected-content img {
        pointer-events: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
      }

      @media print {
        body {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
  }
}

// Hook para usar no React
export function useContentProtection() {
  const protection = ContentProtection.getInstance()

  return {
    activate: () => protection.activate(),
    deactivate: () => protection.deactivate(),
  }
}
