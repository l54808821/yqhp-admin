import type { Component } from 'vue';

import CodeExecuteRenderer from './CodeExecuteRenderer.vue';
import DefaultToolRenderer from './DefaultToolRenderer.vue';
import FileOpRenderer from './FileOpRenderer.vue';
import HttpRequestRenderer from './HttpRequestRenderer.vue';
import JsonParseRenderer from './JsonParseRenderer.vue';
import SearchRenderer from './SearchRenderer.vue';
import ShellExecRenderer from './ShellExecRenderer.vue';
import VarRenderer from './VarRenderer.vue';
import WebFetchRenderer from './WebFetchRenderer.vue';

const toolRenderers: Record<string, Component> = {
  code_execute: CodeExecuteRenderer,
  http_request: HttpRequestRenderer,
  shell_exec: ShellExecRenderer,
  bing_search: SearchRenderer,
  google_search: SearchRenderer,
  web_fetch: WebFetchRenderer,
  read_file: FileOpRenderer,
  write_file: FileOpRenderer,
  edit_file: FileOpRenderer,
  append_file: FileOpRenderer,
  list_dir: FileOpRenderer,
  var_read: VarRenderer,
  var_write: VarRenderer,
  json_parse: JsonParseRenderer,
};

export function getToolRenderer(toolName: string): Component {
  return toolRenderers[toolName] || DefaultToolRenderer;
}

export { DefaultToolRenderer, toolRenderers };
