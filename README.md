# @thornfe/jql2iql

## Quick Start

### Basic Usage

```typescript
import { jql2iql, transformFieldsToConstantsMap } from '@thornfe/jql2iql';

// Prepare field mappings
const fields = [/* your raw field data */];
const fieldTypes = [/* your field type data */];
const constantsMap = transformFieldsToConstantsMap({
  fields,
  fieldTypes
});

// Convert JQL to IQL
const jql = 'project = SCRUM AND status = "In Progress"';
const iql = jql2iql(jql, constantsMap);
console.log(iql); // "所属空间" = "SCRUM" and "状态" = "In Progress"
```

### Advanced Usage

```typescript
import {
  parseJQL,
  astToIQL,
  transformFieldsToConstantsMap,
  type ConstantsMap,
  type RawField,
  type FieldTypeInfo
} from '@thornfe/jql2iql';

// Step 1: Prepare your field mappings
const fields: RawField[] = [
  {
    key: 'workspace',
    name: '所属空间',
    objectId: 'field-001',
    fieldType: { objectId: 'IJ9nXcXYKB' }
  },
  // ... more fields
];

const fieldTypes: FieldTypeInfo[] = [
  {
    key: 'Workspace',
    name: '空间',
    objectId: 'IJ9nXcXYKB'
  },
  // ... more field types
];

const constantsMap: ConstantsMap = transformFieldsToConstantsMap({
  fields,
  fieldTypes,
  projectMap: { 'SCRUM': '敏捷项目' },
  versionMap: { 'v1.0': ['version-id-1'] }
});

// Step 2: Parse JQL to AST
const jql = 'assignee = currentUser() AND priority in (High, Critical)';
const ast = parseJQL(jql);

// Step 3: Convert AST to IQL
const iql = astToIQL(ast, constantsMap);
console.log(iql);
```

## 📖 API Documentation

### Main Functions

#### `jql2iql(jqlText: string, constantsMap: ConstantsMap): string`

Convert JQL query string to IQL query string.

**Parameters:**
- `jqlText`: JQL query string
- `constantsMap`: Field and value mappings

**Returns:** IQL query string

#### `parseJQL(jqlText: string): ASTNode | null`

Parse JQL query string into AST.

**Parameters:**
- `jqlText`: JQL query string

**Returns:** AST node or null if parsing fails

#### `astToIQL(ast: ASTNode, constantsMap: ConstantsMap): string`

Convert AST to IQL query string.

**Parameters:**
- `ast`: AST node from parseJQL
- `constantsMap`: Field and value mappings

**Returns:** IQL query string

#### `transformFieldsToConstantsMap(options: TransformOptions): ConstantsMap`

Transform raw field data into constants map for conversion.

**Parameters:**
- `options`: Transform options object
  - `fields`: Array of raw field objects
  - `fieldTypes`: Array of field type objects
  - `projectMap`: (Optional) Project key to name mapping
  - `versionMap`: (Optional) Version name to ID mapping

**Returns:** ConstantsMap object

**Example:**
```typescript
const constantsMap = transformFieldsToConstantsMap({
  fields: rawFields,
  fieldTypes: fieldTypes,
  projectMap: { 'PROJ': 'Project Name' },
  versionMap: { 'v1.0': ['10000'] }
});
```

### Types

#### `ConstantsMap`

```typescript
interface ConstantsMap {
  projectMap?: Record<string, string>;
  versionMap?: Record<string, string[]>;
  component?: Record<string, string>;
  cascade?: Record<string, string>;
  fieldMap?: JiraFieldMap;
}
```

#### `RawField`

```typescript
interface RawField {
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
      title?: string;
    }>;
  };
}
```

## 🔧 Supported Features

### Operators

- **Comparison**: `=`, `!=`, `>`, `>=`, `<`, `<=`
- **Contains**: `~` (contains), `!~` (not contains)
- **Set**: `in`, `not in`
- **Null**: `is`, `is not`
- **Logic**: `AND`, `OR`, `NOT`

### Functions

- `currentUser()` - Current user
- `membersOf(group)` - Members of a user group
- `cascadeOption(value)` - Cascade option value

### Field Types

- User fields (assignee, reporter, creator, etc.)
- Date fields (created, updated, custom dates)
- Text fields (summary, description, etc.)
- Number fields (story points, custom numbers)
- Select fields (status, priority, custom selects)
- Multi-select fields (labels, components, versions)
- Cascade fields
- User group fields

### Special Features

- `ORDER BY` clause support
- Custom field mapping
- Enum value mapping
- Version and component mapping
- Empty/null value handling

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Build
pnpm build

# Run benchmark
pnpm benchmark
```

## 📝 Examples

### Basic Queries

```typescript
// Simple equality
jql2iql('status = "In Progress"', constantsMap)
// → "状态" = "In Progress"

// Multiple conditions
jql2iql('project = SCRUM AND assignee = currentUser()', constantsMap)
// → "所属空间" = "SCRUM" and "负责人" = "currentUser()"

// IN operator
jql2iql('priority in (High, Critical)', constantsMap)
// → "优先级" in ["High", "Critical"]
```

### Complex Queries

```typescript
// Logical operators
jql2iql('(status = Open OR status = "In Progress") AND assignee = currentUser()', constantsMap)

// Date queries
jql2iql('created >= -7d AND updated <= -1d', constantsMap)

// User group
jql2iql('assignee in membersOf("developers")', constantsMap)

// ORDER BY
jql2iql('status = Open ORDER BY priority DESC, created ASC', constantsMap)
```
