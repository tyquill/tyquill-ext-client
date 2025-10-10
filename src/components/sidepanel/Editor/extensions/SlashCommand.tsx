import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { SlashCommands, getSuggestionItems, SlashCommandsRef } from '../SlashCommands';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          // Delete the '/' character and any query text
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .run();

          // Execute the command
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return getSuggestionItems({ editor: this.editor })
            .filter((item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase())
            )
            .slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer<SlashCommandsRef>;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommands, {
                props: {
                  ...props,
                  command: (item: any) => {
                    props.command({ ...item });
                  },
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                maxWidth: 'none',
                arrow: false,
                offset: [0, 8],
                zIndex: 10000,
              });
            },

            onUpdate(props: any) {
              component.updateProps({
                ...props,
                command: (item: any) => {
                  props.command({ ...item });
                },
              });

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              return component.ref?.onKeyDown(props.event) || false;
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
