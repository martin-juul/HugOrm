# HugORM 🐾

A lightweight, flexible ORM for JavaScript/TypeScript with support for multiple database adapters (IndexedDB, LocalStorage, InMemory) and relationship management.

## Features ✨
- Multiple database adapters (IndexedDB, LocalStorage, InMemory)
- TypeScript-first design with decorators
- Relationship management (hasOne, hasMany, belongsTo, belongsToMany)
- Migration system with version control
- Transaction support
- Event emitters for model lifecycle hooks
- Flexible query builder
- Logging integration
- Pagination support

## Quick Start

### Define a model

```typescript
import { hugmodel, Column, PrimaryColumn, hasMany } from 'hugorm';

@hugmodel()
class User extends Model {
  @PrimaryColumn()
  id!: number;

  @Column({ type: String })
  name!: string;

  @hasMany(() => Post, 'authorId')
  posts!: Post[];
}

@hugmodel()
class Post extends Model {
  @PrimaryColumn()
  id!: number;

  @Column({ type: String })
  title!: string;

  @Column({ type: Number })
  authorId!: number;
}
```

### Initialize the ORM

```typescript
import { HugOrm, IndexedDbAdapter } from 'hugorm';

const adapter = new IndexedDbAdapter('my-db');
const orm = new HugOrm({
  adapter,
  autoMigrate: true,
  logger: new ConsoleLogger()
});

await orm.bootstrap();
```

### Basic CRUD Operations

```typescript
// Create
const user = await User.create({ name: "Alice" });

// Read
const foundUser = await User.find(1);

// Update
user.name = "Alicia";
await user.save();

// Delete
await user.delete();
```

### Relationships 🤝

#### Define Relationships

```typescript
class Author extends Model {
  // Has Many
  @hasMany(() => Book, 'authorId')
  books!: Book[];

  // Has One
  @hasOne(() => Profile, 'userId')
  profile!: Profile;
}

class Book extends Model {
  // Belongs To
  @belongsTo(() => Author, 'authorId')
  author!: Author;

  // Belongs To Many
  @belongsToMany(() => Tag, 'book_tags', 'bookId', 'tagId')
  tags!: Tag[];
}
```

### Query Relationships

```typescript
const author = await Author.find(1);
const books = await author.books;
const profile = await author.profile;
```

### Migrations 🛠️

#### Create Migration

````typescript
import { Schema } from 'hugorm';

export default Schema.create(1, 'users', (table) => {
  table.id();
  table.string('name', 255);
  table.integer('age');
  table.date('createdAt');
  table.index({ name: 'idx_name', columns: ['name'] });
});
````

#### Run Migrations

```typescript
await orm.applyMigrations();
```

### Adapters 🔌

Choose from three built-in adapters:

```typescript
// IndexedDB
new IndexedDbAdapter('db-name');

// LocalStorage
new LocalStorageAdapter('db-name');

// In-memory (for testing)
new InMemoryAdapter();
```

### Transactions 🔄

```typescript
await orm.getDatabase().transaction(async () => {
  const user = await User.create({ name: "Bob" });
  await Post.create({ title: "Hello", authorId: user.id! });
});
```

### Logging 📝

```typescript
import { ConsoleLogger } from 'hugorm';

new HugOrm({
  adapter: /* ... */,
  logger: new ConsoleLogger() // Logs to console
});
```

### API Reference 📚
Key components:

- HugOrm: Main ORM configuration
- Model: Base model class
- Schema: Migration schema builder
- Database: Core database operations
- Adapter: Database adapter interface
- Relationship: Base relationship class
