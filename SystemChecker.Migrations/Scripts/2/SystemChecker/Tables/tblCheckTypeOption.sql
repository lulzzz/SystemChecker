﻿IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tblCheckTypeOption' AND COLUMN_NAME='Multiple') BEGIN
	ALTER TABLE dbo.tblCheckTypeOption ADD Multiple BIT NOT NULL CONSTRAINT DEFAULT_TEMP DEFAULT 0
	ALTER TABLE dbo.tblCheckTypeOption DROP CONSTRAINT DEFAULT_TEMP
END
