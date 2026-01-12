import type { ConstantsMap, JiraFieldMap, FieldTypeKey } from './types';

/**
 * 原始字段对象接口
 */
export interface RawField {
  key: string;
  name: string;
  objectId: string;
  fieldType: {
    objectId: string;
  };
  data?: {
    customData?: Array<{
      label?: string;
      value?: string;
      title?: string;  // 用于 component 字段
    }>;
  };
}

/**
 * JQL 系统字段到 IQL 字段的映射
 */
const SYSTEM_FIELD_MAPPING: Record<string, string> = {
  project: 'workspace',
  creator: 'createdBy',
  created: 'createdAt',
  updated: 'updatedAt',
  assignee: 'assignee',
  reporter: 'reporter',
  status: 'status',
  Sprint: 'sprint',
  priority: 'priority',
  summary: 'name',
  text: 'name',
  key: 'key',
  'Story Points': 'StoryPoint',
  component: 'r_module_management_associated_module',
  labels: 'jira_system_labels',
  description: 'jira_system_description',
  fixVersion: 'version',
  affectedVersion: 'jira_system_versions',
  environment: 'jira_system_environment',
  resolution: 'jira_system_resolution',
};

/**
 * 字段类型信息接口
 */
export interface FieldTypeInfo {
  key: string;
  name: string;
  objectId: string;
  [key: string]: any;
}

/**
 * transformFieldsToConstantsMap 的参数接口
 */
export interface TransformOptions {
  /** 原始字段数组 */
  fields: RawField[];
  /** 字段类型映射数组 */
  fieldTypes: FieldTypeInfo[];
  /** 项目映射（可选）*/
  projectMap?: Record<string, string>;
  /** 版本映射（可选）*/
  versionMap?: Record<string, string[]>;
}

/**
 * 创建枚举值映射
 * @param customData 自定义数据数组
 * @param labelKey 标签的键名（'label' 或 'title'）
 * @param inverse 是否反转映射方向（true: value->label, false: label->value）
 */
function createValueMap(
  customData: Array<{ label?: string; value?: string; title?: string }>,
  labelKey: 'label' | 'title' = 'label',
  inverse = false
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of customData) {
    const label = labelKey === 'title' ? (item.title || item.label) : item.label;
    if (label && item.value) {
      map[inverse ? item.value : label] = inverse ? label : item.value;
    }
  }
  return map;
}

/**
 * 将映射添加到多个键
 */
function addMapToKeys(
  enumValueMaps: Record<string, Record<string, string>>,
  keys: string[],
  valueMap: Record<string, string>
): void {
  for (const key of keys) {
    enumValueMaps[key] = valueMap;
  }
}

/**
 * 将原始字段数组转换为 ConstantsMap 格式
 * 这个函数应该在外部调用一次，然后重复使用返回的 ConstantsMap 进行多次转换
 *
 * @param options 转换选项对象
 * @returns ConstantsMap 对象，可直接传给 jql2iql 使用
 *
 * @example
 * ```ts
 * const constantsMap = transformFieldsToConstantsMap({
 *   fields: rawFields,
 *   fieldTypes: fieldTypes,
 *   projectMap: { BBB: "项目B" },
 *   versionMap: { "Version 1.0": ["10000"] }
 * });
 * ```
 */
export function transformFieldsToConstantsMap(
  options: TransformOptions
): ConstantsMap {
  const { fields, fieldTypes, projectMap, versionMap } = options;

  // 使用 Map 提前索引 fieldTypes，避免重复遍历（O(1) 查找复杂度）
  const fieldTypeMap = new Map<string, FieldTypeKey>();
  for (const ft of fieldTypes) {
    fieldTypeMap.set(ft.objectId, ft.key as FieldTypeKey);
  }

  const fieldMap: JiraFieldMap = {};
  const enumValueMaps: Record<string, Record<string, string>> = {};
  let componentMap: Record<string, string> | undefined;
  const cascadeMaps: Record<string, string> = {};

  for (const field of fields) {
    const { key, name, objectId, fieldType, data } = field;
    const fieldTypeKey = fieldTypeMap.get(fieldType.objectId) || 'Text';
    const jqlFieldKeys = findJQLFieldKeys(key, name);

    // 构建字段映射
    const fieldInfo = {
      objectId,
      customFieldKey: name,
      fieldTypeKey,
      fieldTypeId: fieldType.objectId,
    };

    for (const jqlFieldKey of jqlFieldKeys) {
      fieldMap[jqlFieldKey] = fieldInfo;
    }

    // 处理自定义字段 ID（如 customfield_10108）
    if (key.startsWith('customfield_')) {
      fieldMap[key.replace('customfield_', '')] = fieldInfo;
    }

    // 处理枚举类型字段的 customData
    if (data?.customData && data.customData.length > 0) {
      const isComponent = key === 'r_module_management_associated_module' || name === '所属模块';
      const isCascade = fieldTypeKey === 'Cascade';

      if (isCascade) {
        const valueMap = createValueMap(data.customData, 'label', true);
        addMapToKeys(enumValueMaps, [name, ...jqlFieldKeys], valueMap);
        Object.assign(cascadeMaps, valueMap);
      } else if (isComponent) {
        componentMap = createValueMap(data.customData, 'title');
      } else {
        const valueMap = createValueMap(data.customData);
        if (Object.keys(valueMap).length > 0) {
          addMapToKeys(enumValueMaps, [name, ...jqlFieldKeys], valueMap);
        }
      }
    }
  }

  return {
    projectMap,
    versionMap,
    component: componentMap,
    cascade: Object.keys(cascadeMaps).length > 0 ? cascadeMaps : undefined,
    fieldMap,
    ...enumValueMaps,
  };
}

/**
 * 查找字段的 JQL 字段名（可能返回多个，如"标题"同时映射 text 和 summary）
 * 对于系统字段，返回 JQL 标准名称；对于自定义字段，返回字段名或 key
 */
function findJQLFieldKeys(key: string, name: string): string[] {
  // 特殊的系统字段（通过 name 匹配）
  const nameToJQLMap: Record<string, string[]> = {
    '标题': ['text', 'summary'], // 标题同时映射 text 和 summary
    '负责人': ['assignee'],
    '创建人': ['creator'],
    '创建时间': ['created'],
    '更新人': ['updatedBy'],
    '报告人': ['reporter'],
    '优先级': ['priority'],
    '状态': ['status'],
    '迭代': ['Sprint'],
    '所属模块': ['component'],
    '标签': ['labels'],
    '描述': ['description'],
  };

  if (nameToJQLMap[name]) {
    return nameToJQLMap[name];
  }

  // 检查是否是 IQL 系统字段（通过 key 匹配）
  const matchedKeys: string[] = [];
  for (const [jqlKey, iqlKey] of Object.entries(SYSTEM_FIELD_MAPPING)) {
    if (key === iqlKey) {
      matchedKeys.push(jqlKey);
    }
  }

  if (matchedKeys.length > 0) {
    return matchedKeys;
  }

  // 自定义字段：优先使用字段名称
  return [name];
}
