CREATE TABLE `phocoa_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` varchar(64) NOT NULL,
	`tableNm` text,
	`shoe` text NOT NULL,
	`cnt` int NOT NULL,
	`lastRealUpdateAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phocoa_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `phocoa_snapshots_tableId_unique` UNIQUE(`tableId`)
);
