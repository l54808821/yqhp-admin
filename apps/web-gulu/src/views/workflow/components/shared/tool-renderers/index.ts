import type { Component } from 'vue';

import CodeExecuteParams from './CodeExecuteParams.vue';
import CodeExecuteRenderer from './CodeExecuteRenderer.vue';
import DefaultParamsRenderer from './DefaultParamsRenderer.vue';
import DefaultToolRenderer from './DefaultToolRenderer.vue';
import FileOpRenderer from './FileOpRenderer.vue';
import HttpRequestParams from './HttpRequestParams.vue';
import HttpRequestRenderer from './HttpRequestRenderer.vue';
import JsonParseRenderer from './JsonParseRenderer.vue';
import SearchRenderer from './SearchRenderer.vue';
import ShellExecParams from './ShellExecParams.vue';
import ShellExecRenderer from './ShellExecRenderer.vue';
import VarRenderer from './VarRenderer.vue';
import WebFetchRenderer from './WebFetchRenderer.vue';

interface ToolRendererEntry {
  detail: Component;
  params?: Component;
}

const toolRenderers: Record<string, ToolRendererEntry> = {
  code_execute: { detail: CodeExecuteRenderer, params: CodeExecuteParams },
  http_request: { detail: HttpRequestRenderer, params: HttpRequestParams },
  shell_exec: { detail: ShellExecRenderer, params: ShellExecParams },
  bing_search: { detail: SearchRenderer },
  google_search: { detail: SearchRenderer },
  web_fetch: { detail: WebFetchRenderer },
  read_file: { detail: FileOpRenderer },
  write_file: { detail: FileOpRenderer },
  edit_file: { detail: FileOpRenderer },
  append_file: { detail: FileOpRenderer },
  list_dir: { detail: FileOpRenderer },
  var_read: { detail: VarRenderer },
  var_write: { detail: VarRenderer },
  json_parse: { detail: JsonParseRenderer },
};

export function getToolRenderer(toolName: string): Component {
  return toolRenderers[toolName]?.detail || DefaultToolRenderer;
}

export function getToolParamsRenderer(toolName: string): Component {
  return toolRenderers[toolName]?.params || DefaultParamsRenderer;
}

export { DefaultParamsRenderer, DefaultToolRenderer, toolRenderers };
