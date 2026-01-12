import { jql2iql } from '../src/index';
import { transformFieldsToConstantsMap } from '../src/field-transformer';
import { fields } from '../test/fields';
import { fieldTypes } from '../test/fieldTypes';

// 准备测试数据
const constantsMap = transformFieldsToConstantsMap({
  fields: fields as any,
  fieldTypes: fieldTypes as any
});

// 测试用的 JQL 查询
const testQueries = [
  'project = TEST AND status = "In Progress"',
  'assignee = currentUser() AND status in (Open, "In Progress", Reopened)',
  'priority = High AND created >= -7d',
  'project in (TEST, DEMO) AND labels = important',
  'status WAS "In Progress" BY currentUser() DURING ("2024-01-01", "2024-12-31")',
  'sprint in openSprints() AND type = Story',
  'resolution = Unresolved ORDER BY priority DESC',
  'text ~ "bug fix" AND created >= startOfMonth(-1)',
  'fixVersion = "1.0.0" AND component = "Frontend"',
  'reporter in membersOf("developers") AND duedate <= now()',
];

interface BenchmarkResult {
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  queriesPerSecond: number;
}

/**
 * 执行性能基准测试
 */
function runBenchmark(iterations: number = 1000): BenchmarkResult {
  const times: number[] = [];
  let totalTime = 0;

  console.log(`开始性能测试：执行 ${iterations} 次 jql2iql 转换\n`);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    // 轮流使用不同的测试查询，使测试更真实
    const query = testQueries[i % testQueries.length];

    const iterationStart = performance.now();
    jql2iql(query, constantsMap);
    const iterationEnd = performance.now();

    const iterationTime = iterationEnd - iterationStart;
    times.push(iterationTime);
    totalTime += iterationTime;
  }

  const endTime = performance.now();
  const actualTotalTime = endTime - startTime;

  // 计算统计数据
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const queriesPerSecond = (iterations / actualTotalTime) * 1000;

  return {
    totalTime: actualTotalTime,
    averageTime,
    minTime,
    maxTime,
    iterations,
    queriesPerSecond,
  };
}

/**
 * 格式化时间显示
 */
function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  } else {
    return `${(ms / 1000).toFixed(2)} s`;
  }
}

/**
 * 打印基准测试结果
 */
function printResults(result: BenchmarkResult) {
  console.log('='.repeat(60));
  console.log('性能测试结果');
  console.log('='.repeat(60));
  console.log(`执行次数:       ${result.iterations.toLocaleString()}`);
  console.log(`总耗时:         ${formatTime(result.totalTime)}`);
  console.log(`平均耗时:       ${formatTime(result.averageTime)}`);
  console.log(`最小耗时:       ${formatTime(result.minTime)}`);
  console.log(`最大耗时:       ${formatTime(result.maxTime)}`);
  console.log(`吞吐量:         ${result.queriesPerSecond.toFixed(2)} 次/秒`);
  console.log('='.repeat(60));
}

/**
 * 验证转换结果正确性
 */
function validateConversions() {
  console.log('验证转换结果正确性...\n');

  const validationTests = [
    {
      jql: 'project = TEST',
      description: '简单项目查询',
    },
    {
      jql: 'assignee = currentUser() AND status = Open',
      description: '当前用户和状态查询',
    },
    {
      jql: 'priority in (High, Critical) ORDER BY created DESC',
      description: '优先级列表和排序',
    },
  ];

  let allPassed = true;

  validationTests.forEach((test, index) => {
    try {
      const result = jql2iql(test.jql, constantsMap);
      if (result) {
        console.log(`✓ 测试 ${index + 1} 通过: ${test.description}`);
        console.log(`  JQL: ${test.jql}`);
        console.log(`  IQL: ${result}\n`);
      } else {
        console.log(`✗ 测试 ${index + 1} 失败: ${test.description} - 返回空字符串\n`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`✗ 测试 ${index + 1} 失败: ${test.description}`);
      console.log(`  错误: ${error}\n`);
      allPassed = false;
    }
  });

  return allPassed;
}

// 主函数
function main() {
  console.log('JQL to IQL 性能基准测试\n');

  // 首先验证正确性
  const isValid = validateConversions();

  if (!isValid) {
    console.log('⚠️  某些转换测试未通过，但继续进行性能测试...\n');
  }

  // 预热：运行几次防止 JIT 优化影响结果
  console.log('预热中...');
  for (let i = 0; i < 100; i++) {
    jql2iql(testQueries[i % testQueries.length], constantsMap);
  }
  console.log('预热完成\n');

  // 运行基准测试
  const result = runBenchmark(1000);
  printResults(result);

  // 额外测试：不同规模的性能测试
  console.log('\n运行不同规模的性能测试...\n');

  const scales = [100, 500, 1000, 5000];
  scales.forEach(scale => {
    const scaleResult = runBenchmark(scale);
    console.log(`${scale} 次调用: 总耗时 ${formatTime(scaleResult.totalTime)}, ` +
                `平均 ${formatTime(scaleResult.averageTime)}, ` +
                `吞吐量 ${scaleResult.queriesPerSecond.toFixed(2)} 次/秒`);
  });
}

// 执行
main();
