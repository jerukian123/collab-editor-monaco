import type * as monaco from 'monaco-editor';

export function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export function createCursorWidget(
  socketId: string,
  position: { lineNumber: number; column: number },
  color: string
): monaco.editor.IContentWidget {
  return {
    getDomNode: function () {
      const domNode = document.createElement('div');
      domNode.innerHTML = `
        <div style="position: relative; display: inline-block;">
          <div style="width: 2px; height: 20px; background: ${color}; position: relative;">
            <div style="position: absolute; bottom: 100%; left: 0; background: ${color}; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; font-weight: 500; margin-bottom: 2px;">${socketId}</div>
          </div>
        </div>
      `;
      return domNode;
    },
    getId: function () {
      return `cursor-${socketId}`;
    },
    getPosition: function () {
      return {
        position,
        preference: [0] // ContentWidgetPositionPreference.EXACT
      };
    }
  };
}
