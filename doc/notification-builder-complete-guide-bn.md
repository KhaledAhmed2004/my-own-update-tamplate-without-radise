# NotificationBuilder - Complete Guide (বাংলা)

> **Last Updated**: 2024-01-20
> **Status**: Documentation Complete, Implementation Pending
> **Author**: Claude Code

---

## 📑 Table of Contents

1. [Overview - কি এবং কেন](#1-overview---কি-এবং-কেন)
2. [Current System Analysis - এখন যা আছে](#2-current-system-analysis---এখন-যা-আছে)
3. [NotificationBuilder Architecture](#3-notificationbuilder-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Core API Reference](#5-core-api-reference)
6. [Channels - Delivery Methods](#6-channels---delivery-methods)
7. [Templates System](#7-templates-system)
8. [Scheduling System](#8-scheduling-system)
9. [EmailBuilder Integration](#9-emailbuilder-integration)
10. [Usage Examples - Complete Scenarios](#10-usage-examples---complete-scenarios)
11. [Migration Guide - Existing Code](#11-migration-guide---existing-code)
12. [Troubleshooting](#12-troubleshooting)
13. [Best Practices](#13-best-practices)

---

## 1. Overview - কি এবং কেন

### 🎯 NotificationBuilder কি?

NotificationBuilder হলো একটি **unified notification API** যা একটি chainable interface এর মাধ্যমে multiple channels এ notification পাঠাতে পারে।

### ❓ কেন দরকার?

**আগে (Current System):**
```typescript
// 😫 প্রতিটা channel আলাদাভাবে handle করতে হয়
// Push notification
await pushNotificationHelper.sendPushNotification({
  notification: { title: 'Order Shipped', body: '...' },
  token: userDeviceToken
});

// Socket emit
io.to(`user::${userId}`).emit('ORDER_UPDATE', { orderId: '123' });

// Email
const { html } = new EmailBuilder().useTemplate('orderShipped', {...}).build();
await EmailBuilder.send({ to: email, subject: 'Order Shipped', html });

// Database
await Notification.create({
  title: 'Order Shipped',
  text: '...',
  receiver: userId,
  type: 'ORDER'
});
```

**পরে (NotificationBuilder):**
```typescript
// 😊 একটি call এ সব channels
await new NotificationBuilder()
  .to(userId)
  .useTemplate('orderShipped', { orderNumber: '#12345' })
  .viaAll()  // Push + Socket + Email + DB
  .send();
```

### ✅ কি কি সুবিধা?

| Feature | Before | After |
|---------|--------|-------|
| Lines of code | ~30 lines | ~5 lines |
| Channel control | Manual each | `.viaPush()`, `.viaEmail()` |
| Templates | None | Pre-built + Custom |
| Scheduling | Not possible | `.schedule()`, `.scheduleAfter()` |
| Batching | Loop manually | `.toMany([users])` |
| Email integration | Separate call | Built-in |
| Error handling | Each channel | Centralized |

---

## 2. Current System Analysis - এখন যা আছে

### 📁 Existing Files (এগুলো UNCHANGED থাকবে):

```
src/app/modules/notification/
├── notification.model.ts        # ✅ Unchanged - Mongoose schema
├── notification.interface.ts    # ✅ Unchanged - TypeScript types
├── notification.service.ts      # ✅ Unchanged - CRUD operations
├── notification.controller.ts   # ✅ Unchanged - Route handlers
├── notification.routes.ts       # ✅ Unchanged - API endpoints
├── notificationsHelper.ts       # ✅ Unchanged - sendNotifications()
└── pushNotificationHelper.ts    # ✅ Unchanged - Firebase FCM
```

### 🔄 Current Flow:

```
sendNotifications(data)
       │
       ├─→ Notification.create() → MongoDB
       │
       ├─→ User.findById() → Get deviceTokens
       │         │
       │         └─→ pushNotificationHelper.sendPushNotifications()
       │                     │
       │                     └─→ Firebase Cloud Messaging
       │
       └─→ io.emit(`get-notification::${userId}`) → Socket.IO
```

### ⚠️ Current Limitations:

1. **No channel control** - সব channel এ একসাথে যায়
2. **No templates** - প্রতিবার manually title/text লিখতে হয়
3. **No email** - Push আর Socket only
4. **No scheduling** - Immediate send only
5. **No batching** - একজনকে একবার করে পাঠাতে হয়

### ✅ What NotificationBuilder Adds:

```
NotificationBuilder (NEW)
       │
       ├─→ Channel Selection (viaPush, viaSocket, viaEmail, viaDatabase)
       │
       ├─→ Template System (useTemplate with variables)
       │
       ├─→ Scheduling (schedule, scheduleAfter)
       │
       ├─→ Batching (toMany, toRole)
       │
       └─→ EmailBuilder Integration (automatic email sending)
```

---

## 3. NotificationBuilder Architecture

### 🏗️ High-Level Architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     NotificationBuilder                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Builder Methods (Chainable)                             │   │
│  │  .to() .toMany() .useTemplate() .viaPush() .schedule()  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Channel Router                                          │   │
│  │  Decides which channels to use based on configuration    │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │            │            │            │              │
│           ▼            ▼            ▼            ▼              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Push   │  │ Socket  │  │  Email  │  │Database │           │
│  │ Channel │  │ Channel │  │ Channel │  │ Channel │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │                  │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
   Firebase FCM   Socket.IO   EmailBuilder   MongoDB
   (Existing)     (Existing)   (New)        (Existing)
```

### 🔄 Internal Flow:

```typescript
// User calls:
await new NotificationBuilder()
  .to(userId)
  .useTemplate('orderShipped', { orderNumber: '#123' })
  .viaPush()
  .viaEmail()
  .send();

// Internal steps:
// 1. Resolve user → Get email, deviceTokens from User model
// 2. Resolve template → Get push/email/socket/db content
// 3. Check scheduling → Immediate or scheduled?
// 4. If immediate:
//    a. Push Channel → Firebase FCM
//    b. Email Channel → EmailBuilder → Nodemailer
//    c. Socket Channel → io.emit()
//    d. Database Channel → Notification.create()
// 5. If scheduled:
//    → Save to ScheduledNotification collection
//    → Background job will process later
```

---

## 4. Folder Structure

### 📁 New Files (NotificationBuilder):

```
src/app/builder/NotificationBuilder/
├── index.ts                      # Main export
├── NotificationBuilder.ts        # Core builder class (~400 lines)
│
├── channels/                     # Delivery channel implementations
│   ├── index.ts                  # Channel exports
│   ├── push.channel.ts           # Firebase FCM integration
│   ├── socket.channel.ts         # Socket.IO integration
│   ├── email.channel.ts          # EmailBuilder integration
│   └── database.channel.ts       # MongoDB Notification storage
│
├── templates/                    # Notification templates
│   ├── index.ts                  # Template exports
│   ├── newMessage.ts             # Chat message notification
│   ├── orderPlaced.ts            # Order placed
│   ├── orderShipped.ts           # Order shipped
│   ├── orderDelivered.ts         # Order delivered
│   ├── paymentReceived.ts        # Payment success
│   ├── paymentFailed.ts          # Payment failed
│   ├── bidReceived.ts            # New bid on task
│   ├── bidAccepted.ts            # Bid accepted
│   ├── taskCompleted.ts          # Task marked complete
│   ├── welcome.ts                # Welcome notification
│   └── systemAlert.ts            # System notifications
│
└── scheduler/                    # Scheduling system
    ├── index.ts                  # Scheduler exports
    ├── ScheduledNotification.model.ts  # MongoDB model
    └── scheduler.service.ts      # Background job processor
```

### 📁 Updated Files:

```
src/app/builder/index.ts          # Add NotificationBuilder export
```

### 📁 Unchanged Files (Existing):

```
src/app/modules/notification/     # ALL files unchanged
src/helpers/socketHelper.ts       # Unchanged
src/app/builder/EmailBuilder/     # Unchanged (used internally)
```

---

## 5. Core API Reference

### 🔧 Constructor & Basic Setup

```typescript
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// Basic initialization
const notification = new NotificationBuilder();

// With options
const notification = new NotificationBuilder({
  defaultChannels: ['push', 'database'],  // Default channels if none specified
  throwOnError: false,                     // Don't throw, just log errors
});
```

### 👤 Recipients - কাকে পাঠাবেন

```typescript
// Single user (by ID)
.to(userId: string | ObjectId)

// Single user (by User object)
.to(user: IUser)

// Multiple users
.toMany(userIds: string[] | ObjectId[])

// All users with a specific role
.toRole(role: 'ADMIN' | 'USER' | 'TASKER' | 'POSTER')

// Exclude specific users (use with toMany or toRole)
.except(userIds: string[])
```

**Examples:**
```typescript
// Single user
.to('507f1f77bcf86cd799439011')

// Multiple users
.toMany(['user1Id', 'user2Id', 'user3Id'])

// All admins
.toRole('ADMIN')

// All users except some
.toRole('USER').except(['blockedUserId'])
```

### 📝 Content - কি পাঠাবেন

```typescript
// Using template (Recommended)
.useTemplate(templateName: string, variables?: Record<string, any>)

// Manual content
.setTitle(title: string)
.setText(text: string)
.setType(type: NotificationType)
.setReference(referenceId: string | ObjectId)
.setData(data: Record<string, any>)  // Extra payload
.setIcon(iconUrl: string)            // Push notification icon
.setImage(imageUrl: string)          // Push notification image
```

**Examples:**
```typescript
// Template (preferred)
.useTemplate('orderShipped', {
  orderNumber: '#12345',
  trackingUrl: 'https://track.com/12345',
  estimatedDelivery: 'Jan 25, 2024'
})

// Manual
.setTitle('Order Shipped!')
.setText('Your order #12345 has been shipped.')
.setType('ORDER')
.setReference(orderId)
.setData({ trackingUrl: 'https://...' })
```

### 📡 Channels - কোথায় পাঠাবেন

```typescript
// Individual channels
.viaPush()       // Firebase Cloud Messaging
.viaSocket()     // Socket.IO real-time
.viaEmail()      // Email (via EmailBuilder)
.viaDatabase()   // Store in Notification collection

// Shortcuts
.viaAll()        // All 4 channels
.viaRealtime()   // Push + Socket only (no email, no DB)

// Conditional
.viaPushIf(condition: boolean)
.viaEmailIf(condition: boolean)
```

**Examples:**
```typescript
// Chat message - no email needed
.viaPush().viaSocket().viaDatabase()

// Order update - all channels
.viaAll()

// Marketing - only if user subscribed
.viaEmailIf(user.marketingOptIn)
.viaPushIf(user.pushEnabled)
```

### ⏰ Scheduling - কখন পাঠাবেন

```typescript
// Immediate (default)
.sendNow()  // or just .send()

// Specific date/time
.schedule(date: Date)

// Relative time
.scheduleAfter(duration: string)  // '5m', '2h', '1d', '1w'

// Cancel scheduled
NotificationBuilder.cancelScheduled(scheduledId: string)
```

**Examples:**
```typescript
// Send 2 hours later
.scheduleAfter('2h')

// Send tomorrow at 9 AM
.schedule(new Date('2024-01-21T09:00:00'))

// Send 1 week later
.scheduleAfter('1w')
```

### 🚀 Execution - পাঠানো

```typescript
// Send notification(s)
await notification.send(): Promise<NotificationResult>

// Returns:
{
  success: boolean;
  sent: {
    push: number;      // How many push sent
    socket: number;    // How many socket events emitted
    email: number;     // How many emails sent
    database: number;  // How many DB records created
  };
  failed: {
    push: string[];    // Failed user IDs
    email: string[];
    // ...
  };
  scheduled?: string;  // Scheduled notification ID (if scheduled)
}
```

### 🔧 Static Methods

```typescript
// Register custom template
NotificationBuilder.registerTemplate(name: string, template: INotificationTemplate)

// Cancel scheduled notification
NotificationBuilder.cancelScheduled(scheduledId: string): Promise<boolean>

// Get pending scheduled notifications
NotificationBuilder.getPending(userId?: string): Promise<IScheduledNotification[]>

// Process scheduled notifications (called by background job)
NotificationBuilder.processScheduled(): Promise<void>
```

---

## 6. Channels - Delivery Methods

### 📱 Push Channel (Firebase FCM)

**Purpose:** Mobile/browser push notifications

**Internal Implementation:**
```typescript
// channels/push.channel.ts
import { pushNotificationHelper } from '@/app/modules/notification/pushNotificationHelper';

export const sendPush = async (
  users: IUser[],
  content: PushContent
): Promise<PushResult> => {
  const results = { sent: 0, failed: [] };

  for (const user of users) {
    if (user.deviceTokens?.length > 0) {
      try {
        await pushNotificationHelper.sendPushNotifications({
          notification: {
            title: content.title,
            body: content.body,
            ...(content.icon && { icon: content.icon }),
            ...(content.image && { image: content.image }),
          },
          data: content.data,
          tokens: user.deviceTokens,
        });
        results.sent++;
      } catch (error) {
        results.failed.push(user._id.toString());
      }
    }
  }

  return results;
};
```

**Template Content:**
```typescript
// In template file
push: {
  title: '📦 Order Shipped!',
  body: 'Your order {{orderNumber}} is on the way!',
  icon: 'https://example.com/icons/shipping.png',
  image: 'https://example.com/images/truck.png',  // Big image (Android)
  data: {
    type: 'ORDER_UPDATE',
    orderId: '{{orderId}}',
    action: 'VIEW_ORDER'
  }
}
```

### 🔌 Socket Channel (Real-time)

**Purpose:** Instant browser notifications

**Internal Implementation:**
```typescript
// channels/socket.channel.ts
export const sendSocket = async (
  users: IUser[],
  content: SocketContent
): Promise<SocketResult> => {
  // @ts-ignore
  const io = global.io;

  if (!io) {
    return { sent: 0, failed: users.map(u => u._id.toString()) };
  }

  const results = { sent: 0, failed: [] };

  for (const user of users) {
    try {
      // Emit to user's private room
      io.to(`user::${user._id}`).emit(content.event, {
        ...content.data,
        timestamp: new Date().toISOString(),
      });
      results.sent++;
    } catch (error) {
      results.failed.push(user._id.toString());
    }
  }

  return results;
};
```

**Template Content:**
```typescript
// In template file
socket: {
  event: 'ORDER_UPDATE',  // Event name client listens to
  data: {
    type: 'SHIPPED',
    orderId: '{{orderId}}',
    message: 'Your order has been shipped!'
  }
}
```

**Client Side Listening:**
```javascript
// Frontend code
socket.on('ORDER_UPDATE', (data) => {
  console.log('Order update:', data);
  showToast(data.message);
});
```

### 📧 Email Channel (via EmailBuilder)

**Purpose:** Email notifications for important updates

**Internal Implementation:**
```typescript
// channels/email.channel.ts
import { EmailBuilder } from '@/app/builder/EmailBuilder';

export const sendEmail = async (
  users: IUser[],
  content: EmailContent
): Promise<EmailResult> => {
  const results = { sent: 0, failed: [] };

  for (const user of users) {
    if (user.email) {
      try {
        // Use EmailBuilder internally
        const { html, subject } = new EmailBuilder()
          .setTheme(content.theme || 'default')
          .useTemplate(content.template, content.variables)
          .build();

        await EmailBuilder.send({
          to: user.email,
          subject: content.subject || subject,
          html,
        });
        results.sent++;
      } catch (error) {
        results.failed.push(user._id.toString());
      }
    }
  }

  return results;
};
```

**Template Content:**
```typescript
// In template file
email: {
  template: 'orderShipped',  // EmailBuilder template name
  subject: '📦 Your Order {{orderNumber}} Has Shipped!',
  theme: 'default'  // Optional, defaults to 'default'
}
```

### 💾 Database Channel (MongoDB)

**Purpose:** Persist notifications for notification center/history

**Internal Implementation:**
```typescript
// channels/database.channel.ts
import Notification from '@/app/modules/notification/notification.model';

export const saveToDatabase = async (
  users: IUser[],
  content: DatabaseContent
): Promise<DatabaseResult> => {
  const results = { sent: 0, failed: [] };

  const notifications = users.map(user => ({
    title: content.title,
    text: content.text,
    receiver: user._id,
    type: content.type || 'SYSTEM',
    referenceId: content.referenceId,
    isRead: false,
  }));

  try {
    const created = await Notification.insertMany(notifications);
    results.sent = created.length;
  } catch (error) {
    results.failed = users.map(u => u._id.toString());
  }

  return results;
};
```

**Template Content:**
```typescript
// In template file
database: {
  type: 'ORDER',  // NotificationType
  title: 'Order Shipped',
  text: 'Your order {{orderNumber}} has been shipped and is on the way!'
}
```

---

## 7. Templates System

### 📋 Template Structure

```typescript
// templates/orderShipped.ts
import { INotificationTemplate } from '../NotificationBuilder';

export const orderShipped: INotificationTemplate = {
  name: 'orderShipped',

  // Push notification content
  push: {
    title: '📦 Order Shipped!',
    body: 'Your order {{orderNumber}} is on the way to {{deliveryAddress}}',
    icon: '/icons/shipping.png',
    data: {
      type: 'ORDER_SHIPPED',
      orderId: '{{orderId}}',
      trackingUrl: '{{trackingUrl}}'
    }
  },

  // Socket.IO event content
  socket: {
    event: 'ORDER_UPDATE',
    data: {
      status: 'SHIPPED',
      orderId: '{{orderId}}',
      trackingUrl: '{{trackingUrl}}',
      estimatedDelivery: '{{estimatedDelivery}}'
    }
  },

  // Email content (uses EmailBuilder)
  email: {
    template: 'orderShipped',  // EmailBuilder template
    subject: '📦 Your Order {{orderNumber}} Has Shipped!'
  },

  // Database notification content
  database: {
    type: 'ORDER',
    title: 'Order Shipped',
    text: 'Your order {{orderNumber}} has been shipped. Track: {{trackingUrl}}'
  }
};
```

### 📝 Pre-built Templates

| Template Name | Push | Socket | Email | DB | Use Case |
|--------------|------|--------|-------|-----|----------|
| `newMessage` | ✅ | ✅ | ❌ | ✅ | New chat message |
| `orderPlaced` | ✅ | ✅ | ✅ | ✅ | Order confirmation |
| `orderShipped` | ✅ | ✅ | ✅ | ✅ | Shipping notification |
| `orderDelivered` | ✅ | ✅ | ✅ | ✅ | Delivery confirmation |
| `paymentReceived` | ✅ | ✅ | ✅ | ✅ | Payment success |
| `paymentFailed` | ✅ | ❌ | ✅ | ✅ | Payment failure |
| `bidReceived` | ✅ | ✅ | ❌ | ✅ | New bid on task |
| `bidAccepted` | ✅ | ✅ | ✅ | ✅ | Bid accepted |
| `taskCompleted` | ✅ | ✅ | ✅ | ✅ | Task marked done |
| `welcome` | ✅ | ❌ | ✅ | ❌ | New user welcome |
| `systemAlert` | ✅ | ✅ | ❌ | ✅ | System notifications |

### ➕ Custom Template Registration

```typescript
// Register at app startup (server.ts)
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// Custom template
NotificationBuilder.registerTemplate('promotionAlert', {
  name: 'promotionAlert',
  push: {
    title: '🎉 Special Offer!',
    body: '{{promotionTitle}} - {{discount}}% off! Use code: {{code}}'
  },
  socket: {
    event: 'PROMOTION',
    data: {
      promotionId: '{{promotionId}}',
      discount: '{{discount}}',
      expiresAt: '{{expiresAt}}'
    }
  },
  email: {
    template: 'promotion',  // Must exist in EmailBuilder
    subject: '🎉 {{discount}}% Off - {{promotionTitle}}'
  },
  database: {
    type: 'SYSTEM',
    title: 'Special Offer',
    text: '{{promotionTitle}} - {{discount}}% off!'
  }
});

// Use it
await new NotificationBuilder()
  .toRole('USER')
  .useTemplate('promotionAlert', {
    promotionTitle: 'Summer Sale',
    discount: 30,
    code: 'SUMMER30',
    promotionId: 'promo123',
    expiresAt: '2024-02-01'
  })
  .viaAll()
  .send();
```

### 🔄 Variable Interpolation

Templates use `{{variableName}}` syntax:

```typescript
// Template
push: {
  title: 'Hello {{userName}}!',
  body: 'Your order {{orderNumber}} will arrive by {{deliveryDate}}'
}

// Usage
.useTemplate('orderUpdate', {
  userName: 'John',
  orderNumber: '#12345',
  deliveryDate: 'Jan 25'
})

// Result
{
  title: 'Hello John!',
  body: 'Your order #12345 will arrive by Jan 25'
}
```

---

## 8. Scheduling System

### 🗄️ Database Schema

```typescript
// scheduler/ScheduledNotification.model.ts
const ScheduledNotificationSchema = new Schema({
  // Recipients
  recipients: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Content
  template: String,           // Template name
  variables: Schema.Types.Mixed,  // Template variables

  // Manual content (if no template)
  title: String,
  text: String,
  type: {
    type: String,
    enum: ['ADMIN', 'BID', 'BOOKING', 'TASK', 'BID_ACCEPTED', 'SYSTEM', 'DELIVERY_SUBMITTED', 'PAYMENT_PENDING'],
    default: 'SYSTEM'
  },
  referenceId: Schema.Types.ObjectId,
  data: Schema.Types.Mixed,

  // Channels
  channels: [{
    type: String,
    enum: ['push', 'socket', 'email', 'database']
  }],

  // Scheduling
  scheduledFor: {
    type: Date,
    required: true,
    index: true  // Index for efficient querying
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Results
  result: {
    sent: {
      push: Number,
      socket: Number,
      email: Number,
      database: Number
    },
    failed: Schema.Types.Mixed,
    processedAt: Date,
    error: String
  },

  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for finding due notifications
ScheduledNotificationSchema.index({ scheduledFor: 1, status: 1 });
```

### ⚙️ Background Job

```typescript
// scheduler/scheduler.service.ts
import cron from 'node-cron';
import ScheduledNotification from './ScheduledNotification.model';
import { NotificationBuilder } from '../NotificationBuilder';

export class NotificationScheduler {
  private static isRunning = false;

  /**
   * Start the scheduler
   * Call this in server.ts after DB connection
   */
  static start() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduled();
    });

    console.log('📅 Notification scheduler started');
  }

  /**
   * Process all due notifications
   */
  static async processScheduled() {
    // Prevent overlapping runs
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // Find all due notifications
      const dueNotifications = await ScheduledNotification.find({
        scheduledFor: { $lte: now },
        status: 'pending'
      }).limit(100);  // Process in batches

      for (const scheduled of dueNotifications) {
        await this.processSingle(scheduled);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single scheduled notification
   */
  private static async processSingle(scheduled: IScheduledNotification) {
    // Mark as processing
    scheduled.status = 'processing';
    await scheduled.save();

    try {
      // Build and send
      let builder = new NotificationBuilder()
        .toMany(scheduled.recipients);

      // Use template or manual content
      if (scheduled.template) {
        builder = builder.useTemplate(scheduled.template, scheduled.variables);
      } else {
        builder = builder
          .setTitle(scheduled.title)
          .setText(scheduled.text)
          .setType(scheduled.type);
        if (scheduled.referenceId) {
          builder = builder.setReference(scheduled.referenceId);
        }
      }

      // Set channels
      for (const channel of scheduled.channels) {
        switch (channel) {
          case 'push': builder = builder.viaPush(); break;
          case 'socket': builder = builder.viaSocket(); break;
          case 'email': builder = builder.viaEmail(); break;
          case 'database': builder = builder.viaDatabase(); break;
        }
      }

      // Send immediately (bypass scheduling)
      const result = await builder.sendNow();

      // Update status
      scheduled.status = 'sent';
      scheduled.result = {
        ...result,
        processedAt: new Date()
      };
      await scheduled.save();

    } catch (error) {
      scheduled.status = 'failed';
      scheduled.result = {
        error: error.message,
        processedAt: new Date()
      };
      await scheduled.save();
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancel(scheduledId: string): Promise<boolean> {
    const result = await ScheduledNotification.updateOne(
      { _id: scheduledId, status: 'pending' },
      { status: 'cancelled' }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get pending scheduled notifications
   */
  static async getPending(userId?: string): Promise<IScheduledNotification[]> {
    const query: any = { status: 'pending' };
    if (userId) {
      query.recipients = userId;
    }
    return ScheduledNotification.find(query).sort({ scheduledFor: 1 });
  }
}
```

### 🚀 Starting the Scheduler

```typescript
// server.ts
import { NotificationScheduler } from '@/app/builder/NotificationBuilder/scheduler';

// After MongoDB connection
mongoose.connect(config.database_url).then(() => {
  console.log('Database connected');

  // Start notification scheduler
  NotificationScheduler.start();
});
```

### 📅 Usage Examples

```typescript
// Schedule for specific time
await new NotificationBuilder()
  .to(userId)
  .useTemplate('paymentReminder', { amount: '$50', dueDate: 'Jan 25' })
  .schedule(new Date('2024-01-24T09:00:00'))  // 1 day before due
  .viaPush()
  .viaEmail()
  .send();

// Schedule relative (2 hours from now)
await new NotificationBuilder()
  .to(userId)
  .useTemplate('cartAbandoned', { itemCount: 3 })
  .scheduleAfter('2h')
  .viaPush()
  .viaEmail()
  .send();

// Cancel scheduled
await NotificationBuilder.cancelScheduled('scheduledNotificationId');

// View pending
const pending = await NotificationBuilder.getPending(userId);
```

---

## 9. EmailBuilder Integration

### 🔗 How It Works

NotificationBuilder internally uses EmailBuilder when `.viaEmail()` is called:

```
NotificationBuilder.send()
        │
        └─→ viaEmail() enabled?
                │
                ├─→ Yes: Get email template name from notification template
                │         │
                │         └─→ EmailBuilder.useTemplate(emailTemplateName, variables)
                │                    │
                │                    └─→ EmailBuilder.send({ to: user.email, ... })
                │
                └─→ No: Skip email channel
```

### 📝 Template Mapping

Notification templates reference EmailBuilder templates:

```typescript
// NotificationBuilder template: templates/orderShipped.ts
export const orderShipped: INotificationTemplate = {
  // ... other channels ...

  email: {
    template: 'orderShipped',  // ← This is EmailBuilder template name
    subject: 'Your Order {{orderNumber}} Has Shipped!'
  }
};

// EmailBuilder template: EmailBuilder/templates/orderShipped.ts
// (Must exist for email channel to work)
```

### ✅ Required Setup

For email channel to work:

1. **EmailBuilder template must exist**
   ```
   src/app/builder/EmailBuilder/templates/orderShipped.ts  ← Must exist
   ```

2. **Email config must be set**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email
   EMAIL_PASS=your-password
   EMAIL_FROM=noreply@example.com
   ```

3. **User must have email**
   ```typescript
   // If user.email is empty, email channel skips silently
   ```

### 🆕 Creating Matching Templates

When you create a NotificationBuilder template with email support:

```typescript
// Step 1: Create NotificationBuilder template
// NotificationBuilder/templates/orderShipped.ts
export const orderShipped: INotificationTemplate = {
  email: {
    template: 'orderShipped',  // Reference to EmailBuilder template
    subject: 'Order {{orderNumber}} Shipped'
  },
  // ... other channels
};

// Step 2: Create matching EmailBuilder template
// EmailBuilder/templates/orderShipped.ts
export const orderShipped: IEmailTemplate = {
  subject: 'Order {{orderNumber}} Shipped',
  render: (variables, theme, components) => {
    // ... email HTML
  }
};

// Step 3: Export in EmailBuilder/templates/index.ts
export { orderShipped } from './orderShipped';
```

---

## 10. Usage Examples - Complete Scenarios

### 📱 Scenario 1: New Chat Message

**Requirement:** User receives new message notification (push + socket + DB, no email)

```typescript
// In MessageService.sendMessage()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// After saving message to DB
const message = await Message.create({ ... });

// Get offline receivers
const offlineReceivers = receivers.filter(r => !isOnline(r));

// Send notification to offline users only
if (offlineReceivers.length > 0) {
  await new NotificationBuilder()
    .toMany(offlineReceivers)
    .useTemplate('newMessage', {
      senderName: sender.name,
      senderAvatar: sender.avatar,
      preview: message.text.substring(0, 50),
      chatId: chat._id,
      messageId: message._id
    })
    .viaPush()
    .viaSocket()
    .viaDatabase()
    // No .viaEmail() - chat messages don't need email
    .send();
}
```

### 📦 Scenario 2: Order Shipped

**Requirement:** Customer notified on all channels when order ships

```typescript
// In OrderService.shipOrder()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// After updating order status
await Order.findByIdAndUpdate(orderId, { status: 'SHIPPED', ... });

// Notify customer on ALL channels
await new NotificationBuilder()
  .to(order.customer)
  .useTemplate('orderShipped', {
    orderNumber: order.orderNumber,
    orderId: order._id,
    trackingUrl: `https://track.example.com/${order.trackingNumber}`,
    estimatedDelivery: order.estimatedDelivery,
    deliveryAddress: order.shippingAddress.city
  })
  .viaAll()  // Push + Socket + Email + DB
  .send();
```

### 💰 Scenario 3: Payment Received

**Requirement:** Seller notified when payment is released

```typescript
// In PaymentService.releasePayment()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// After payment release
await Payment.findByIdAndUpdate(paymentId, { status: 'RELEASED' });

// Notify seller
await new NotificationBuilder()
  .to(payment.seller)
  .useTemplate('paymentReceived', {
    amount: formatCurrency(payment.amount),
    orderId: payment.orderId,
    orderNumber: order.orderNumber,
    buyerName: buyer.name,
    paymentMethod: 'Bank Transfer'
  })
  .viaAll()
  .send();
```

### 🎯 Scenario 4: New Bid on Task

**Requirement:** Task poster notified when someone bids

```typescript
// In BidService.createBid()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// After bid creation
const bid = await Bid.create({ ... });

// Notify task poster
await new NotificationBuilder()
  .to(task.poster)
  .useTemplate('bidReceived', {
    taskTitle: task.title,
    taskId: task._id,
    bidAmount: formatCurrency(bid.amount),
    bidderName: bidder.name,
    bidderRating: bidder.rating,
    bidMessage: bid.message?.substring(0, 100)
  })
  .viaPush()
  .viaSocket()
  .viaDatabase()
  // No email for bids - too frequent
  .send();
```

### ⏰ Scenario 5: Cart Abandoned Reminder

**Requirement:** Remind user 2 hours after abandoning cart

```typescript
// In CartService.addToCart() or CartService.updateCart()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// When user adds/updates cart, schedule reminder
await new NotificationBuilder()
  .to(userId)
  .useTemplate('cartAbandoned', {
    itemCount: cart.items.length,
    totalAmount: formatCurrency(cart.total),
    cartUrl: `https://example.com/cart`
  })
  .scheduleAfter('2h')  // Send 2 hours from now
  .viaPush()
  .viaEmail()
  // No DB - it's a marketing notification
  .send();

// Note: If user completes checkout, cancel the scheduled notification
// (Would need to store scheduledId and call NotificationBuilder.cancelScheduled())
```

### 👥 Scenario 6: Admin Broadcast

**Requirement:** Notify all users about system maintenance

```typescript
// In AdminService.broadcastAnnouncement()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// Notify all users
await new NotificationBuilder()
  .toRole('USER')  // All users
  .useTemplate('systemAlert', {
    title: 'Scheduled Maintenance',
    message: 'System will be down for maintenance on Jan 25, 10 PM - 12 AM',
    severity: 'warning'
  })
  .viaPush()
  .viaSocket()
  .viaDatabase()
  .send();

// Or notify admins only
await new NotificationBuilder()
  .toRole('ADMIN')
  .useTemplate('systemAlert', {
    title: 'Server Alert',
    message: 'High CPU usage detected',
    severity: 'error'
  })
  .viaAll()
  .send();
```

### 🎁 Scenario 7: Scheduled Promotion

**Requirement:** Send promotional notification at specific time

```typescript
// In PromotionService.createPromotion()
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';

// Schedule for promotion start time
await new NotificationBuilder()
  .toRole('USER')
  .useTemplate('promotionAlert', {
    promotionTitle: 'Black Friday Sale',
    discount: 50,
    code: 'BLACK50',
    expiresAt: promotion.endDate
  })
  .schedule(promotion.startDate)  // Send when promotion starts
  .viaPush()
  .viaEmail()
  .send();
```

---

## 11. Migration Guide - Existing Code

### ⚠️ Important: No Breaking Changes

NotificationBuilder is **ADDITIVE ONLY**. Your existing code continues to work:

```typescript
// ✅ This STILL WORKS (existing code)
import { sendNotifications } from '@/app/modules/notification/notificationsHelper';

await sendNotifications({
  title: 'New Message',
  text: 'Hello...',
  receiver: userId,
  type: 'SYSTEM'
});
```

### 🔄 Gradual Migration

You can migrate gradually, one notification at a time:

```typescript
// BEFORE (existing)
await sendNotifications({
  title: 'Order Shipped',
  text: `Your order ${orderNumber} has been shipped`,
  receiver: userId,
  type: 'ORDER',
  referenceId: orderId
});

// AFTER (NotificationBuilder)
await new NotificationBuilder()
  .to(userId)
  .useTemplate('orderShipped', { orderNumber, orderId })
  .viaPush()
  .viaSocket()
  .viaEmail()      // Now includes email!
  .viaDatabase()
  .send();
```

### 📋 Migration Checklist

When migrating a notification:

- [ ] Identify where `sendNotifications()` is called
- [ ] Check what data is passed
- [ ] Find or create matching template
- [ ] Decide which channels needed
- [ ] Replace with NotificationBuilder
- [ ] Test all channels
- [ ] Remove old code (optional)

### 🚫 What NOT to Change

Do NOT modify these files:
- `notification.model.ts` - Schema unchanged
- `notification.interface.ts` - Types unchanged
- `notification.service.ts` - CRUD unchanged
- `notification.controller.ts` - API unchanged
- `notification.routes.ts` - Endpoints unchanged
- `notificationsHelper.ts` - Still available for legacy use
- `pushNotificationHelper.ts` - Used internally by NotificationBuilder

---

## 12. Troubleshooting

### ❌ Push notifications not sending

**Symptoms:** `.viaPush()` doesn't send anything

**Checklist:**
1. User has `deviceTokens` in DB?
   ```typescript
   const user = await User.findById(userId);
   console.log(user.deviceTokens);  // Should be non-empty array
   ```

2. Firebase configured?
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-json>
   ```

3. Tokens valid? (Firebase tokens expire)

### ❌ Email not sending

**Symptoms:** `.viaEmail()` doesn't send anything

**Checklist:**
1. User has `email` in DB?
2. Email config set?
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=...
   EMAIL_PASS=...
   ```
3. EmailBuilder template exists for notification template?
4. Check logs for SMTP errors

### ❌ Socket not working

**Symptoms:** `.viaSocket()` doesn't reach client

**Checklist:**
1. `global.io` initialized in server.ts?
2. User connected to Socket.IO?
3. User in correct room (`user::${userId}`)?
4. Client listening to correct event?

### ❌ Scheduled notifications not processing

**Symptoms:** Scheduled notifications stay pending

**Checklist:**
1. Scheduler started in server.ts?
   ```typescript
   NotificationScheduler.start();
   ```
2. Check MongoDB for stuck notifications:
   ```javascript
   db.schedulednotifications.find({ status: 'pending' })
   ```
3. Server running continuously? (setTimeout lost on restart)

### ❌ Template not found

**Error:** `Template "xyz" not found`

**Solution:**
1. Check template exists in `templates/` folder
2. Check exported in `templates/index.ts`
3. Check spelling matches exactly

---

## 13. Best Practices

### ✅ DO

```typescript
// ✅ Use templates for consistent notifications
.useTemplate('orderShipped', { ... })

// ✅ Select only needed channels
.viaPush().viaSocket().viaDatabase()  // Skip email for non-critical

// ✅ Use meaningful template variables
.useTemplate('orderShipped', {
  orderNumber: order.orderNumber,
  trackingUrl: tracking.url,
  estimatedDelivery: formatDate(delivery.eta)
})

// ✅ Handle errors gracefully
try {
  await notification.send();
} catch (error) {
  logger.error('Notification failed', error);
  // Don't block main operation for notification failure
}

// ✅ Use scheduling for reminders
.scheduleAfter('2h')  // Cart abandoned
.schedule(dueDate.subtract(1, 'day'))  // Payment reminder
```

### ❌ DON'T

```typescript
// ❌ Don't send email for every notification
.viaAll()  // Use only when ALL channels needed

// ❌ Don't hardcode content
.setTitle('Order Shipped')  // Use templates instead
.setText('Your order has shipped')

// ❌ Don't notify too frequently
// Batch related notifications or use digest

// ❌ Don't block critical operations on notification failure
await payment.process();
await notification.send();  // If this fails, payment still processed
await order.save();  // Don't put notification in middle of transaction
```

### 📊 Channel Selection Guide

| Notification Type | Push | Socket | Email | DB |
|------------------|------|--------|-------|-----|
| Chat message | ✅ | ✅ | ❌ | ✅ |
| Order update | ✅ | ✅ | ✅ | ✅ |
| Payment | ✅ | ✅ | ✅ | ✅ |
| Bid received | ✅ | ✅ | ❌ | ✅ |
| System alert | ✅ | ✅ | ❌ | ✅ |
| Marketing/Promo | ✅ | ❌ | ✅ | ❌ |
| Welcome | ✅ | ❌ | ✅ | ❌ |
| Password reset | ❌ | ❌ | ✅ | ❌ |
| Typing indicator | ❌ | ✅ | ❌ | ❌ |

---

## 📚 Quick Reference

### Import
```typescript
import { NotificationBuilder } from '@/app/builder/NotificationBuilder';
```

### Basic Usage
```typescript
await new NotificationBuilder()
  .to(userId)
  .useTemplate('templateName', { var1: 'value1' })
  .viaPush()
  .viaSocket()
  .viaDatabase()
  .send();
```

### All Methods
```typescript
// Recipients
.to(userId)
.toMany([userId1, userId2])
.toRole('ADMIN')
.except([excludeId])

// Content
.useTemplate(name, variables)
.setTitle(title)
.setText(text)
.setType(type)
.setReference(id)
.setData(data)
.setIcon(url)
.setImage(url)

// Channels
.viaPush()
.viaSocket()
.viaEmail()
.viaDatabase()
.viaAll()
.viaRealtime()
.viaPushIf(condition)
.viaEmailIf(condition)

// Scheduling
.schedule(date)
.scheduleAfter(duration)
.sendNow()

// Execute
.send()
```

### Static Methods
```typescript
NotificationBuilder.registerTemplate(name, template)
NotificationBuilder.cancelScheduled(id)
NotificationBuilder.getPending(userId?)
```

---

**Document Version:** 1.0
**Created:** 2024-01-20
**Ready for Implementation:** Yes
