-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "visitor_token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ai',
    "handoff_reason" TEXT,
    "is_spam" BOOLEAN NOT NULL DEFAULT false,
    "assigned_user_id" UUID,
    "visitor_name" TEXT,
    "visitor_phone" TEXT,
    "customer_id" UUID,
    "inquiry_id" UUID,
    "entry_path" TEXT,
    "last_path" TEXT,
    "page_kind" TEXT,
    "related_content_id" UUID,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" TEXT,
    "last_visitor_message_at" TIMESTAMPTZ(3),
    "staff_last_read_seq" BIGINT NOT NULL DEFAULT 0,
    "last_visitor_seq" BIGINT NOT NULL DEFAULT 0,
    "ai_reply_count" INTEGER NOT NULL DEFAULT 0,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "client_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversations_visitor_token_hash_created_at_idx" ON "chat_conversations"("visitor_token_hash", "created_at");

-- CreateIndex
CREATE INDEX "chat_conversations_status_last_message_at_idx" ON "chat_conversations"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_conversations_assigned_user_id_status_idx" ON "chat_conversations"("assigned_user_id", "status");

-- CreateIndex
CREATE INDEX "chat_conversations_last_message_at_idx" ON "chat_conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_seq_idx" ON "chat_messages"("conversation_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_seq_key" ON "chat_messages"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_conversation_id_client_id_key" ON "chat_messages"("conversation_id", "client_id");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Live chat permissions. Production never runs the seed, so the migration grants them.
INSERT INTO "permissions" ("id", "code", "description", "module")
VALUES
  (gen_random_uuid(), 'chat.read', 'Xem hộp thư chat với khách', 'chat'),
  (gen_random_uuid(), 'chat.write', 'Tham gia, trả lời và xử lý phiên chat', 'chat')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN ('chat.read', 'chat.write')
WHERE r."code" IN ('owner', 'operator')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" = 'chat.read'
WHERE r."code" = 'viewer'
ON CONFLICT DO NOTHING;
