import type { ASTNode, ConstantsMap } from '../types';
import {
  AST_NODE_TYPES,
  FUNCTION_NAMES,
  NULL_KEYWORDS,
  COMPARISON_OPERATORS,
  SET_OPERATORS,
  NULL_OPERATORS,
  IQL_LOGICAL_OPERATORS,
} from '../constants';

/**
 * 规范化字段名，将 cf[xxx] 格式转换为 xxx
 * @param fieldName 原始字段名
 * @returns 规范化后的字段名
 */
export function normalizeFieldName(fieldName: string): string {
  // 匹配 cf[数字] 格式
  const match = fieldName.match(/^cf\[(\d+)\]$/);
  if (match) {
    return match[1]; // 返回数字部分
  }
  return fieldName; // 返回原字段名
}

/**
 * 过滤 List 中的函数节点（IQL 不支持的函数）
 * @param elements List 中的元素数组
 * @returns 过滤后的元素数组
 */
function filterFunctions(elements: ASTNode[]): ASTNode[] {
  return elements.filter((el: ASTNode) => el.type !== 'Function');
}

/**
 * 清理值中的引号包裹
 * @param value 原始值
 * @returns 清理后的值
 */
function cleanQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * 通用字段转换器配置接口
 */
interface FieldConverterConfig {
  /** IQL 字段名 */
  iqlFieldName: string;
  /** 是否支持函数（如 currentUser()） */
  supportsFunctions?: boolean;
  /** 是否需要值映射（如 version 映射） */
  valueMap?: Record<string, string | string[]>;
  /** 值是否为数值类型（不需要引号） */
  isNumeric?: boolean;
  /** 处理 EMPTY 值为 null */
  handleEmpty?: boolean;
  /** NULL 关键字（默认为 'null'，某些字段可能使用 'NULL'） */
  nullKeyword?: 'null' | 'NULL';
  /** 对于 = 操作符，是否统一转换为 in 操作符（用于 versionMap） */
  useInForEquality?: boolean;
}

/**
 * 通用的字段值转换函数
 * @param value AST 节点
 * @param config 转换配置
 * @returns 转换后的字符串值
 */
function convertValue(value: ASTNode, config: FieldConverterConfig): string {
  if (value.type === AST_NODE_TYPES.FUNCTION) {
    if (!config.supportsFunctions) {
      return '';
    }

    // 提取函数参数
    const args = value.arguments || [];
    const getArgValue = (arg: any): string => {
      const argValue = arg.type === AST_NODE_TYPES.LITERAL ? String(arg.value) : String(arg);
      return cleanQuotes(argValue);
    };

    // 特殊处理 membersOf 函数
    if (value.name === FUNCTION_NAMES.MEMBERS_OF) {
      if (args.length > 0) {
        return `${value.name}(${getArgValue(args[0])})`;
      }
      return `${value.name}()`;
    }

    // 特殊处理 cascadeOption 函数
    if (value.name === FUNCTION_NAMES.CASCADE_OPTION && args.length > 0) {
      const argValue = getArgValue(args[0]);
      // 应用值映射
      if (config.valueMap?.[argValue]) {
        return `"${config.valueMap[argValue]}"`;
      }
      return `"${argValue}"`;
    }

    // 其他函数如 currentUser() 需要带引号
    return `"${value.name}()"`;
  }

  if (value.type === AST_NODE_TYPES.LITERAL) {
    let val = cleanQuotes(String(value.value));

    // 应用值映射
    if (config.valueMap?.[val]) {
      const mappedValue = config.valueMap[val];
      // 如果映射值是数组，返回第一个值（用于单值场景）
      val = Array.isArray(mappedValue) ? mappedValue[0] : mappedValue;
    }

    // 数值类型不加引号
    if (config.isNumeric) {
      const numValue = parseFloat(val);
      // 检查是否为负数，仅支持非负数（包含 0）
      if (!isNaN(numValue) && numValue < 0) {
        return ''; // 负数不支持，返回空字符串
      }
      return val;
    }

    return `"${val}"`;
  }

  return '';
}

/**
 * 通用的等值操作符处理（= 和 !=）
 * @param operator 操作符
 * @param value 值节点
 * @param config 转换配置
 * @returns IQL 查询字符串
 */
function handleEqualityOperator(
  operator: string,
  value: ASTNode,
  config: FieldConverterConfig
): string {
  const normalizedOp = operator.toLowerCase();

  if (normalizedOp !== COMPARISON_OPERATORS.EQUAL && normalizedOp !== COMPARISON_OPERATORS.NOT_EQUAL) {
    return '';
  }

  if (value.type === AST_NODE_TYPES.LITERAL) {
    const val = String(value.value);

    // 处理 EMPTY 值
    if (config.handleEmpty && val.toUpperCase() === NULL_KEYWORDS.EMPTY) {
      const nullOp = normalizedOp === '=' ? 'is' : 'is not';
      const nullKeyword = config.nullKeyword || 'null';
      return `"${config.iqlFieldName}" ${nullOp} ${nullKeyword}`;
    }

    // 如果配置了 useInForEquality，统一使用 in/not in 操作符
    if (config.useInForEquality && config.valueMap) {
      const cleanVal = cleanQuotes(val);
      const mappedValue = config.valueMap[cleanVal];

      const valuesArray: string[] = mappedValue
        ? (Array.isArray(mappedValue) ? mappedValue : [mappedValue])
        : [cleanVal];

      const valuesStr = valuesArray.map(v => `"${v}"`).join(', ');
      const inOp = normalizedOp === '=' ? 'in' : 'not in';
      return `"${config.iqlFieldName}" ${inOp} [${valuesStr}]`;
    }

    const convertedValue = convertValue(value, config);
    if (convertedValue) {
      return `"${config.iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
  }

  if (value.type === AST_NODE_TYPES.FUNCTION && config.supportsFunctions) {
    const convertedValue = convertValue(value, config);
    return `"${config.iqlFieldName}" ${normalizedOp} ${convertedValue}`;
  }

  return '';
}

/**
 * 通用的比较操作符处理（>, >=, <, <=）
 * @param operator 操作符
 * @param value 值节点
 * @param config 转换配置
 * @returns IQL 查询字符串
 */
function handleComparisonOperator(
  operator: string,
  value: ASTNode,
  config: FieldConverterConfig
): string {
  const normalizedOp = operator.toLowerCase();

  if (![
    COMPARISON_OPERATORS.GREATER_THAN,
    COMPARISON_OPERATORS.GREATER_THAN_OR_EQUAL,
    COMPARISON_OPERATORS.LESS_THAN,
    COMPARISON_OPERATORS.LESS_THAN_OR_EQUAL
  ].includes(normalizedOp)) {
    return '';
  }

  if (value.type === AST_NODE_TYPES.LITERAL) {
    const convertedValue = convertValue(value, config);
    if (convertedValue) {
      return `"${config.iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
  }

  return '';
}

/**
 * 通用的 IN/NOT IN 操作符处理
 * @param operator 操作符
 * @param value 值节点（应该是 List 类型或 Function 类型）
 * @param config 转换配置
 * @returns IQL 查询字符串
 */
function handleInOperator(
  operator: string,
  value: ASTNode,
  config: FieldConverterConfig
): string {
  const normalizedOp = operator.toLowerCase();

  if (normalizedOp !== SET_OPERATORS.IN && normalizedOp !== SET_OPERATORS.NOT_IN) {
    return '';
  }

  // 处理单个函数的情况: assignee in membersOf("group")
  if (value.type === AST_NODE_TYPES.FUNCTION && config.supportsFunctions) {
    const convertedValue = convertValue(value, config);
    if (convertedValue) {
      return `"${config.iqlFieldName}" ${normalizedOp} [${convertedValue}]`;
    }
  }

  if (value.type === AST_NODE_TYPES.LIST) {
    // 单次遍历同时过滤函数和分离 EMPTY 值（性能优化）
    const emptyElements: ASTNode[] = [];
    const nonEmptyElements: ASTNode[] = [];

    for (const el of value.elements) {
      // 如果不支持函数，跳过函数节点
      if (!config.supportsFunctions && el.type === AST_NODE_TYPES.FUNCTION) {
        continue;
      }

      if (config.handleEmpty && el.type === AST_NODE_TYPES.LITERAL && /^empty$/i.test(String(el.value))) {
        emptyElements.push(el);
      } else {
        nonEmptyElements.push(el);
      }
    }

    const conditions: string[] = [];

    // 如果有非空值，生成 in/not in 条件
    if (nonEmptyElements.length > 0) {
      const allValues: string[] = [];

      for (const el of nonEmptyElements) {
        if (el.type === AST_NODE_TYPES.LITERAL) {
          const cleanVal = cleanQuotes(String(el.value));
          const mappedValue = config.valueMap?.[cleanVal];

          if (mappedValue) {
            // 如果映射值是数组，展开所有值
            const values = Array.isArray(mappedValue) ? mappedValue : [mappedValue];
            allValues.push(...values.map(v => `"${v}"`));
          } else {
            // 没有映射，使用原值
            const convertedValue = convertValue(el, config);
            if (convertedValue) {
              allValues.push(convertedValue);
            }
          }
        } else {
          // 其他类型节点（如函数）
          const convertedValue = convertValue(el, config);
          if (convertedValue) {
            allValues.push(convertedValue);
          }
        }
      }

      if (allValues.length > 0) {
        conditions.push(`"${config.iqlFieldName}" ${normalizedOp} [${allValues.join(', ')}]`);
      }
    }

    // 如果有 EMPTY，生成 is null/is not null 条件
    if (emptyElements.length > 0) {
      const nullOp = normalizedOp === SET_OPERATORS.IN ? NULL_OPERATORS.IS : NULL_OPERATORS.IS_NOT;
      const nullKeyword = config.nullKeyword || NULL_KEYWORDS.NULL;
      conditions.push(`"${config.iqlFieldName}" ${nullOp} ${nullKeyword}`);
    }

    // 用 or/and 连接条件
    if (conditions.length > 1) {
      const connector = normalizedOp === SET_OPERATORS.IN ? IQL_LOGICAL_OPERATORS.OR : IQL_LOGICAL_OPERATORS.AND;
      return `(${conditions.join(` ${connector} `)})`;
    } else if (conditions.length === 1) {
      return conditions[0];
    }
  }

  return '';
}

/**
 * 通用的 IS/IS NOT 操作符处理
 * @param operator 操作符
 * @param value 值节点
 * @param config 转换配置
 * @returns IQL 查询字符串
 */
function handleIsOperator(
  operator: string,
  value: ASTNode,
  config: FieldConverterConfig
): string {
  const normalizedOp = operator.toLowerCase();

  if ((normalizedOp === 'is' || normalizedOp === 'is not') &&
      value.type === 'Literal') {
    const val = String(value.value).toUpperCase();
    if (val === 'NULL' || val === 'EMPTY') {
      const nullKeyword = config.nullKeyword || 'null';
      return `"${config.iqlFieldName}" ${normalizedOp} ${nullKeyword}`;
    }
  }

  return '';
}

/**
 * 通用的模糊匹配操作符处理（~ 和 !~）
 * @param operator 操作符
 * @param value 值节点
 * @param config 转换配置
 * @returns IQL 查询字符串
 */
function handleContainsOperator(
  operator: string,
  value: ASTNode,
  config: FieldConverterConfig
): string {
  const normalizedOp = operator.toLowerCase();

  if ((normalizedOp === '~' || normalizedOp === '!~') &&
      value.type === 'Literal') {
    const convertedValue = convertValue(value, config);
    if (convertedValue) {
      return `"${config.iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
  }

  return '';
}

/**
 * 通用字段转换器
 * @param fieldName 字段名
 * @param operator 操作符
 * @param value 值节点
 * @param constantsMap 常量映射
 * @param options 额外选项
 * @returns IQL 查询字符串
 */
export function convertGenericField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap,
  options: {
    supportsFunctions?: boolean;
    valueMapKey?: keyof ConstantsMap;
    isNumeric?: boolean;
    handleEmpty?: boolean;
    nullKeyword?: 'null' | 'NULL';
    supportedOperators?: string[];
    useInForEquality?: boolean;
  } = {}
): string {
  const fieldMap = constantsMap.fieldMap || {};
  const normalizedFieldName = normalizeFieldName(fieldName);
  const fieldConfig = fieldMap[normalizedFieldName];
  const iqlFieldName = fieldConfig?.customFieldKey || fieldName;

  // 构建转换配置
  const config: FieldConverterConfig = {
    iqlFieldName,
    supportsFunctions: options.supportsFunctions || false,
    valueMap: options.valueMapKey ? (constantsMap[options.valueMapKey] as Record<string, string | string[]>) : undefined,
    isNumeric: options.isNumeric || false,
    handleEmpty: options.handleEmpty || false,
    nullKeyword: options.nullKeyword || 'null',
    useInForEquality: options.useInForEquality || false
  };

  // 按操作符类型调用相应的处理函数（直接分派避免循环）
  const normalizedOp = operator.toLowerCase();

  if (normalizedOp === '=' || normalizedOp === '!=') {
    return handleEqualityOperator(operator, value, config);
  }
  if (['>', '>=', '<', '<='].includes(normalizedOp)) {
    return handleComparisonOperator(operator, value, config);
  }
  if (normalizedOp === 'in' || normalizedOp === 'not in') {
    return handleInOperator(operator, value, config);
  }
  if (normalizedOp === 'is' || normalizedOp === 'is not') {
    return handleIsOperator(operator, value, config);
  }
  if (normalizedOp === '~' || normalizedOp === '!~') {
    return handleContainsOperator(operator, value, config);
  }

  return '';
}

/**
 * 转换 project 字段
 */
export function convertProjectField(operator: string, value: ASTNode, constantsMap: ConstantsMap): string {
  const projectMap = constantsMap.projectMap || {};

  // project = SCRU
  if (operator === '=') {
    if (value.type === 'Literal') {
      const projectKey = String(value.value);
      const projectName = projectMap[projectKey] || projectKey;
      return `"所属空间" = "${projectName}"`;
    }
  }

  // project in (SCRU, TEST)
  if (operator === 'in') {
    if (value.type === 'List') {
      // 过滤掉函数节点
      const filteredElements = filterFunctions(value.elements);
      const projectNames = filteredElements
        .filter((el: ASTNode) => el.type === 'Literal')
        .map((el: any) => {
          const projectKey = String(el.value);
          return projectMap[projectKey] || projectKey;
        })
        .map((name: string) => `"${name}"`)
        .join(', ');
      return `"所属空间" in [${projectNames}]`;
    }
  }

  return '';
}

/**
 * 转换 issuetype 字段
 */
export function convertIssuetypeField(operator: string, value: ASTNode, constantsMap: ConstantsMap): string {
  // issuetype = Epic
  if (operator === '=') {
    if (value.type === 'Literal') {
      const issueType = String(value.value);
      return `"类型" = "${issueType}"`;
    }
  }

  // issuetype in (Epic, Bug)
  if (operator === 'in') {
    if (value.type === 'List') {
      // 过滤掉函数节点
      const filteredElements = filterFunctions(value.elements);
      const issueTypes = filteredElements
        .filter((el: ASTNode) => el.type === 'Literal')
        .map((el: any) => `"${String(el.value)}"`)
        .join(',');
      return `"类型" in [${issueTypes}]`;
    }
  }

  return '';
}

/**
 * 转换用户字段
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射，包含 fieldMap 配置
 */
export function convertUserField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField(fieldName, operator, value, constantsMap, {
    supportsFunctions: true,
    handleEmpty: true
  });
}

/**
 * 转换版本字段
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertVersionField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField(fieldName, operator, value, constantsMap, {
    valueMapKey: 'versionMap',
    handleEmpty: true,
    nullKeyword: 'NULL',
    useInForEquality: true
  });
}

/**
 * 转换 component 字段（Tree 类型）
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertComponentField(
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField('所属模块', operator, value, constantsMap, {
    valueMapKey: 'component',
    handleEmpty: true,
    nullKeyword: 'NULL'
  });
}

/**
 * 转换 Cascade 字段（级联选择）
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertCascadeField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField(fieldName, operator, value, constantsMap, {
    supportsFunctions: true,
    valueMapKey: 'cascade',
    handleEmpty: true,
    nullKeyword: 'null'
  });
}

/**
 * 转换状态字段
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertStatusField(operator: string, value: ASTNode, constantsMap: ConstantsMap): string {
  // status = "In Progress"
  if (operator === '=') {
    if (value.type === 'Literal') {
      const statusValue = String(value.value);
      // 移除引号包裹
      const cleanValue = statusValue.replace(/^"|"$/g, '');
      return `"状态" = "${cleanValue}"`;
    }
  }

  // status in ("In Progress", "To Do", Done)
  if (operator === 'in') {
    if (value.type === 'List') {
      // 过滤掉函数节点
      const filteredElements = filterFunctions(value.elements);
      const statusValues = filteredElements
        .filter((el: ASTNode) => el.type === 'Literal')
        .map((el: any) => {
          const val = String(el.value);
          // 移除引号包裹
          const cleanValue = val.replace(/^"|"$/g, '');
          return `"${cleanValue}"`;
        })
        .join(', ');
      return `"状态" in [${statusValues}]`;
    }
  }

  return '';
}

/**
 * 转换 Sprint 字段
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertSprintField(operator: string, value: ASTNode, constantsMap: ConstantsMap): string {
  // Sprint = 1
  if (operator === '=') {
    if (value.type === 'Literal') {
      const sprintValue = String(value.value);
      return `"迭代" = "${sprintValue}"`;
    }
  }

  // Sprint in (1, 2)
  if (operator === 'in') {
    if (value.type === 'List') {
      // 过滤掉函数节点
      const filteredElements = filterFunctions(value.elements);
      const sprintValues = filteredElements
        .filter((el: ASTNode) => el.type === 'Literal')
        .map((el: any) => {
          const val = String(el.value);
          return `"${val}"`;
        })
        .join(', ');
      return `"迭代" in [${sprintValues}]`;
    }
  }

  return '';
}

/**
 * 转换 Priority 字段
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertPriorityField(operator: string, value: ASTNode, constantsMap: ConstantsMap): string {
  return convertGenericField('优先级', operator, value, constantsMap, {
    handleEmpty: false
  });
}

/**
 * 转换枚举字段（Checkbox/Dropdown/Radio）
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertEnumField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  // 获取字段配置
  const fieldMap = constantsMap.fieldMap || {};
  const normalizedFieldName = normalizeFieldName(fieldName);
  const fieldConfig = fieldMap[normalizedFieldName];
  const iqlFieldName = fieldConfig?.customFieldKey || fieldName;

  return convertGenericField(fieldName, operator, value, constantsMap, {
    handleEmpty: false,
    valueMapKey: iqlFieldName as keyof ConstantsMap
  });
}

/**
 * @deprecated 使用 convertEnumField 替代
 */
export function convertCheckboxField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertEnumField(fieldName, operator, value, constantsMap);
}

/**
 * 转换 Text/LongText/Name 字段
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertTextField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField(fieldName, operator, value, constantsMap, {
    handleEmpty: false
  });
}

/**
 * 转换数值字段 (Number/Integer/Float)
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertNumberField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  return convertGenericField(fieldName, operator, value, constantsMap, {
    isNumeric: true,
    handleEmpty: true,
    nullKeyword: 'null'
  });
}

/**
 * 转换用户组字段值（使用单引号）
 * @param value AST 节点
 * @returns 转换后的字符串值
 */
function convertUserGroupValue(value: ASTNode): string {
  if (value.type === 'Literal') {
    const val = String(value.value);
    const cleanVal = cleanQuotes(val);
    // 用户组值使用单引号
    return `'${cleanVal}'`;
  }
  return '';
}

/**
 * 转换用户组字段 (UserGroup)
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertUserGroupField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  const fieldMap = constantsMap.fieldMap || {};
  const normalizedFieldName = normalizeFieldName(fieldName);
  const fieldConfig = fieldMap[normalizedFieldName];
  const iqlFieldName = fieldConfig?.customFieldKey || fieldName;

  const normalizedOp = operator.toLowerCase();

  // 处理等值操作符 (= 和 !=)
  if (normalizedOp === '=' || normalizedOp === '!=') {
    const convertedValue = convertUserGroupValue(value);
    if (convertedValue) {
      return `"${iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
    return '';
  }

  // 处理 IN/NOT IN 操作符
  if (normalizedOp === 'in' || normalizedOp === 'not in') {
    if (value.type === 'List') {
      const conditions: string[] = [];
      const values: string[] = [];
      let hasEmpty = false;

      // 单次遍历处理所有元素
      for (const el of value.elements) {
        if (el.type === 'Literal' && String(el.value).toUpperCase() === 'EMPTY') {
          hasEmpty = true;
        } else {
          const convertedValue = convertUserGroupValue(el);
          if (convertedValue) {
            values.push(convertedValue);
          }
        }
      }

      // 如果有非空值，生成 in/not in 条件
      if (values.length > 0) {
        conditions.push(`"${iqlFieldName}" ${normalizedOp} [${values.join(', ')}]`);
      }

      // 如果有 EMPTY，生成 is null/is not null 条件
      if (hasEmpty) {
        const nullOp = normalizedOp === 'in' ? 'is' : 'is not';
        conditions.push(`"${iqlFieldName}" ${nullOp} null`);
      }

      // 用 or/and 连接条件
      if (conditions.length > 1) {
        const connector = normalizedOp === 'in' ? 'or' : 'and';
        return `(${conditions.join(` ${connector} `)})`;
      } else if (conditions.length === 1) {
        return conditions[0];
      }
    }
    return '';
  }

  // 处理 IS/IS NOT 操作符
  if (normalizedOp === 'is' || normalizedOp === 'is not') {
    if (value.type === 'Literal') {
      const val = String(value.value).toUpperCase();
      if (val === 'NULL' || val === 'EMPTY') {
        return `"${iqlFieldName}" ${normalizedOp} null`;
      }
    }
    return '';
  }

  return '';
}

/**
 * IQL 支持的日期函数列表
 */
const SUPPORTED_DATE_FUNCTIONS = [
  'startOfDay',
  'endOfDay',
  'startOfWeek',
  'endOfWeek',
  'startOfMonth',
  'endOfMonth',
  'startOfYear',
  'endOfYear'
];

/**
 * 转换日期函数节点
 * @param funcNode 函数节点
 * @returns 转换后的函数字符串，不支持的函数返回空字符串
 */
function convertDateFunction(funcNode: ASTNode): string {
  if (funcNode.type !== 'Function') {
    return '';
  }

  const funcName = funcNode.name;

  // 检查是否是支持的函数
  if (!SUPPORTED_DATE_FUNCTIONS.includes(funcName)) {
    return '';
  }

  // 处理函数参数（可选的整数参数）
  const args = funcNode.arguments || [];
  if (args.length === 0) {
    return `${funcName}()`;
  } else if (args.length === 1) {
    // 只接受整数参数，参数可能是 ASTNode 对象
    const arg = args[0];
    // 如果参数是对象，提取其 value 属性
    const argValue = typeof arg === 'object' && arg !== null && 'value' in arg ? arg.value : arg;
    return `${funcName}(${argValue})`;
  }

  return '';
}

/**
 * 转换日期字段值
 * @param value AST 节点
 * @returns 转换后的字符串值
 */
function convertDateValue(value: ASTNode): string {
  if (value.type === 'Function') {
    return convertDateFunction(value);
  }

  if (value.type === 'Literal') {
    const val = String(value.value);
    const cleanVal = cleanQuotes(val);

    // 检查是否是时间单位格式（如：-2m, 1h, -7d, 2w）
    const timeUnitMatch = cleanVal.match(/^([+-]?\d+)([mhdw])$/i);
    if (timeUnitMatch) {
      const num = parseInt(timeUnitMatch[1], 10);
      const unit = timeUnitMatch[2].toLowerCase();

      // 分钟和小时不支持，返回空字符串
      if (unit === 'm' || unit === 'h') {
        return '';
      }

      // 天：如果是 0 则不传参数，否则传数字
      if (unit === 'd') {
        return num === 0 ? 'startOfDay()' : `startOfDay(${num})`;
      }

      // 周：乘以 7 转换为天，如果结果是 0 则不传参数
      if (unit === 'w') {
        const days = num * 7;
        return days === 0 ? 'startOfDay()' : `startOfDay(${days})`;
      }
    }

    // 普通日期字面量需要加引号
    return `"${cleanVal}"`;
  }

  return '';
}

/**
 * 转换日期字段 (Date/createdAt/updatedAt)
 * @param fieldName JQL 字段名
 * @param operator 操作符
 * @param value 值
 * @param constantsMap 常量映射
 */
export function convertDateField(
  fieldName: string,
  operator: string,
  value: ASTNode,
  constantsMap: ConstantsMap
): string {
  const fieldMap = constantsMap.fieldMap || {};
  const normalizedFieldName = normalizeFieldName(fieldName);
  const fieldConfig = fieldMap[normalizedFieldName];
  const iqlFieldName = fieldConfig?.customFieldKey || fieldName;

  const normalizedOp = operator.toLowerCase();

  // 处理等值操作符 (= 和 !=)
  if (normalizedOp === '=' || normalizedOp === '!=') {
    const convertedValue = convertDateValue(value);
    if (convertedValue) {
      return `"${iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
    return '';
  }

  // 处理比较操作符 (>, >=, <, <=)
  const comparisonOps = ['>', '>=', '<', '<='];
  if (comparisonOps.includes(normalizedOp)) {
    const convertedValue = convertDateValue(value);
    if (convertedValue) {
      return `"${iqlFieldName}" ${normalizedOp} ${convertedValue}`;
    }
    return '';
  }

  // 处理 IN/NOT IN 操作符
  // 日期类型不支持 IN 和 NOT IN 操作符，除非只包含 EMPTY
  if (normalizedOp === 'in' || normalizedOp === 'not in') {
    if (value.type === 'List') {
      let hasEmpty = false;
      const values: string[] = [];

      // 单次遍历处理所有元素
      for (const el of value.elements) {
        if (el.type === 'Literal' && String(el.value).toUpperCase() === 'EMPTY') {
          hasEmpty = true;
        } else {
          const convertedValue = convertDateValue(el);
          if (convertedValue) {
            values.push(convertedValue);
          }
        }
      }

      // 只包含 EMPTY
      if (hasEmpty && values.length === 0) {
        const nullOp = normalizedOp === 'in' ? 'is' : 'is not';
        return `"${iqlFieldName}" ${nullOp} null`;
      }

      // 包含 EMPTY 和其他值的混合情况
      if (hasEmpty && values.length > 0) {
        const nullOp = normalizedOp === 'in' ? 'is' : 'is not';
        return `("${iqlFieldName}" ${normalizedOp} [${values.join(', ')}] or "${iqlFieldName}" ${nullOp} null)`;
      }
    }
    // 日期类型不支持普通的 IN/NOT IN 操作
    return '';
  }

  // 处理 IS/IS NOT 操作符
  if (normalizedOp === 'is' || normalizedOp === 'is not') {
    if (value.type === 'Literal') {
      const val = String(value.value).toUpperCase();
      if (val === 'NULL' || val === 'EMPTY') {
        return `"${iqlFieldName}" ${normalizedOp} null`;
      }
    }
    return '';
  }

  return '';
}
