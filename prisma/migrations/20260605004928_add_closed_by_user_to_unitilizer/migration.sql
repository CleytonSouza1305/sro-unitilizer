-- CreateTable
CREATE TABLE "Unitilizer" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "unitilizer" VARCHAR(20) NOT NULL,
    "destination" VARCHAR(100) NOT NULL,
    "date" VARCHAR(100) NOT NULL,
    "closed_by_userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unitilizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objects" (
    "id" TEXT NOT NULL,
    "unitilizer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unitilizer_unitilizer_key" ON "Unitilizer"("unitilizer");

-- AddForeignKey
ALTER TABLE "Unitilizer" ADD CONSTRAINT "Unitilizer_closed_by_userId_fkey" FOREIGN KEY ("closed_by_userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objects" ADD CONSTRAINT "Objects_unitilizer_id_fkey" FOREIGN KEY ("unitilizer_id") REFERENCES "Unitilizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
