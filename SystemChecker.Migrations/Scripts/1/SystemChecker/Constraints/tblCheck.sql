﻿IF NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME='tblCheck' AND CONSTRAINT_NAME='FK_tblCheck_tblEnvironment') BEGIN
	ALTER TABLE dbo.tblCheck ADD CONSTRAINT FK_tblCheck_tblEnvironment FOREIGN KEY (EnvironmentID) REFERENCES dbo.tblEnvironment
END