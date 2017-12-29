﻿IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME='Description' AND TABLE_NAME='tblCheck') BEGIN
	ALTER TABLE dbo.tblCheck ADD Description VARCHAR(MAX)
END
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME='GroupID' AND TABLE_NAME='tblCheck') BEGIN
	ALTER TABLE dbo.tblCheck ADD GroupID INT
	ALTER TABLE dbo.tblCheck ADD CONSTRAINT FK_tblCheck_tblCheckGroup FOREIGN KEY (GroupID) REFERENCES dbo.tblCheckGroup
END