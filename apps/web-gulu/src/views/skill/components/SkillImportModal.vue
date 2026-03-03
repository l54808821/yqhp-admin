<script setup lang="ts">
import type { SkillshubDetail, SkillshubSearchResult } from '#/api/skill';

import { ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'ant-design-vue';

import {
  getSkillshubDetailApi,
  importSkillApi,
  installFromSkillshubApi,
  installFromUrlApi,
  searchSkillshubApi,
} from '#/api/skill';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const activeTab = ref('skillshub');

// skills.sh tab
const skillshubPath = ref('');
const searchQuery = ref('');
const searchResults = ref<SkillshubSearchResult[]>([]);
const searchLoading = ref(false);
const selectedDetail = ref<SkillshubDetail | null>(null);
const detailLoading = ref(false);
const installLoading = ref(false);

// URL tab
const importUrl = ref('');
const urlLoading = ref(false);

// Zip tab
const zipLoading = ref(false);

function open() {
  visible.value = true;
  activeTab.value = 'skillshub';
  searchResults.value = [];
  selectedDetail.value = null;
  skillshubPath.value = '';
  searchQuery.value = '';
  importUrl.value = '';
}

async function handleSearch() {
  const q = searchQuery.value.trim();
  if (!q) return;
  searchLoading.value = true;
  selectedDetail.value = null;
  try {
    searchResults.value = (await searchSkillshubApi(q)) || [];
  } catch {
    message.error('搜索失败，请稍后重试');
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}

async function handleSelectSkill(result: SkillshubSearchResult) {
  const path = result.skill_path || `${result.repository}/${result.slug}`;
  skillshubPath.value = path;
  detailLoading.value = true;
  try {
    selectedDetail.value = await getSkillshubDetailApi(path);
  } catch {
    message.error('获取详情失败');
    selectedDetail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function handleLoadDetail() {
  const path = skillshubPath.value.trim();
  if (!path) return;
  detailLoading.value = true;
  try {
    selectedDetail.value = await getSkillshubDetailApi(path);
  } catch {
    message.error('获取详情失败，请检查路径格式');
    selectedDetail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function handleInstallFromSkillshub() {
  const path = skillshubPath.value.trim();
  if (!path) return;
  installLoading.value = true;
  try {
    await installFromSkillshubApi(path);
    message.success('安装成功');
    emit('success');
    visible.value = false;
  } catch (e: any) {
    message.error(e?.message || '安装失败');
  } finally {
    installLoading.value = false;
  }
}

async function handleInstallFromUrl() {
  const url = importUrl.value.trim();
  if (!url) return message.warning('请输入 URL');
  urlLoading.value = true;
  try {
    await installFromUrlApi(url);
    message.success('导入成功');
    emit('success');
    visible.value = false;
  } catch (e: any) {
    message.error(e?.message || '导入失败');
  } finally {
    urlLoading.value = false;
  }
}

async function handleZipImport(info: any) {
  const file = info.file;
  if (!file) return;
  zipLoading.value = true;
  try {
    await importSkillApi(file);
    message.success('导入成功');
    emit('success');
    visible.value = false;
  } catch (e: any) {
    message.error(e?.message || '导入失败');
  } finally {
    zipLoading.value = false;
  }
}

function formatInstalls(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    title="导入 Skill"
    :footer="null"
    width="720px"
    destroyOnClose
  >
    <Tabs v-model:activeKey="activeTab">
      <!-- Tab 1: skills.sh -->
      <Tabs.TabPane key="skillshub" tab="从 skills.sh 安装">
        <Alert
          type="info"
          showIcon
          style="margin-bottom: 12px"
        >
          <template #message>
            从 <a href="https://skills.sh" target="_blank">skills.sh</a> 安装 Skill。支持以下格式：
            <ul style="margin: 4px 0 0; padding-left: 20px; font-size: 12px; color: #666">
              <li>Skill 路径：<code>anthropics/skills/frontend-design</code></li>
              <li>skills.sh URL：<code>https://skills.sh/vercel-labs/skills/find-skills</code></li>
              <li>npx 命令：<code>npx skills add https://github.com/vercel-labs/skills --skill find-skills</code></li>
            </ul>
          </template>
        </Alert>

        <div style="display: flex; gap: 8px; margin-bottom: 12px">
          <Input
            v-model:value="skillshubPath"
            placeholder="粘贴 skill 路径、skills.sh URL 或 npx skills add 命令"
            style="flex: 1"
            @pressEnter="handleLoadDetail"
          />
          <Button type="primary" :loading="detailLoading" @click="handleLoadDetail">加载</Button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 16px">
          <Input.Search
            v-model:value="searchQuery"
            placeholder="搜索 GitHub 上的 Skills 仓库..."
            :loading="searchLoading"
            enterButton
            style="flex: 1"
            @search="handleSearch"
          />
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0 && !selectedDetail" style="max-height: 400px; overflow-y: auto">
          <Card
            v-for="result in searchResults"
            :key="result.slug"
            size="small"
            hoverable
            style="margin-bottom: 8px; cursor: pointer"
            @click="handleSelectSkill(result)"
          >
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                <Typography.Text strong>{{ result.name || result.slug }}</Typography.Text>
                <Typography.Text type="secondary" style="margin-left: 8px">
                  {{ result.repository }}
                </Typography.Text>
              </div>
              <Tag color="blue">{{ formatInstalls(result.installs) }} installs</Tag>
            </div>
            <Typography.Paragraph
              v-if="result.description"
              type="secondary"
              :ellipsis="{ rows: 2 }"
              style="margin: 4px 0 0 0; font-size: 12px"
            >
              {{ result.description }}
            </Typography.Paragraph>
          </Card>
        </div>

        <!-- Detail Panel -->
        <Spin :spinning="detailLoading">
          <Card v-if="selectedDetail" size="small" style="margin-top: 8px">
            <template #title>
              <Space>
                <Typography.Text strong style="font-size: 16px">
                  {{ selectedDetail.name }}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {{ selectedDetail.repository }}
                </Typography.Text>
              </Space>
            </template>

            <div v-if="selectedDetail.description" style="margin-bottom: 12px">
              <Typography.Paragraph>{{ selectedDetail.description }}</Typography.Paragraph>
            </div>

            <div style="display: flex; gap: 24px; margin-bottom: 16px">
              <Statistic
                v-if="selectedDetail.installs"
                title="安装量"
                :value="selectedDetail.installs"
                style="flex: 1"
              />
              <Statistic
                v-if="selectedDetail.weekly_installs"
                title="周安装量"
                :value="selectedDetail.weekly_installs"
                style="flex: 1"
              />
              <Descriptions :column="1" size="small" style="flex: 2" :labelStyle="{ width: '60px' }">
                <Descriptions.Item label="仓库">
                  {{ selectedDetail.repository }}
                </Descriptions.Item>
                <Descriptions.Item v-if="selectedDetail.first_seen" label="首次发现">
                  {{ selectedDetail.first_seen }}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div v-if="selectedDetail.skill_md_preview" style="margin-bottom: 16px">
              <Typography.Title :level="5">SKILL.MD</Typography.Title>
              <pre style="
                background: var(--ant-color-bg-layout, #f5f5f5);
                padding: 12px;
                border-radius: 6px;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-word;
              ">{{ selectedDetail.skill_md_preview }}</pre>
            </div>

            <Space>
              <Button @click="selectedDetail = null">返回列表</Button>
              <Button
                type="primary"
                :loading="installLoading"
                @click="handleInstallFromSkillshub"
              >
                安装此 Skill
              </Button>
              <a
                v-if="selectedDetail.skill_path"
                :href="`https://skills.sh/skill/${selectedDetail.skill_path}`"
                target="_blank"
              >
                在 skills.sh 查看
              </a>
            </Space>
          </Card>
        </Spin>

        <Empty
          v-if="!searchLoading && searchResults.length === 0 && !selectedDetail"
          description="输入路径或搜索关键词来查找 Skill"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </Tabs.TabPane>

      <!-- Tab 2: URL -->
      <Tabs.TabPane key="url" tab="从 URL 导入">
        <Alert
          type="info"
          showIcon
          message="粘贴 SKILL.md 文件的 URL 直接导入。支持 GitHub raw 链接等。"
          style="margin-bottom: 16px"
        />
        <Input.TextArea
          v-model:value="importUrl"
          placeholder="https://raw.githubusercontent.com/owner/repo/main/skill-name/SKILL.md"
          :rows="3"
          style="margin-bottom: 16px"
        />
        <Button type="primary" :loading="urlLoading" @click="handleInstallFromUrl">
          导入
        </Button>
      </Tabs.TabPane>

      <!-- Tab 3: Zip -->
      <Tabs.TabPane key="zip" tab="上传 Zip">
        <Alert
          type="info"
          showIcon
          message="上传 Agent Skills 标准格式的 zip 文件（包含 SKILL.md + 可选 scripts/references/assets 目录）。"
          style="margin-bottom: 16px"
        />
        <Upload
          :showUploadList="false"
          :beforeUpload="() => false"
          accept=".zip"
          @change="handleZipImport"
        >
          <Button :loading="zipLoading">选择 .zip 文件</Button>
        </Upload>
      </Tabs.TabPane>
    </Tabs>
  </Modal>
</template>
