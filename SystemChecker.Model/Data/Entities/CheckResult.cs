using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SystemChecker.Contracts.Enums;

namespace SystemChecker.Model.Data.Entities
{
    [Table("tblCheckResult")]
    public class CheckResult
    {
        [Key]
        public int ID { get; set; }

        public int CheckID { get; set; }

        [Required]
        [ForeignKey("CheckID")]
        public Check Check { get; set; }

        public DateTimeOffset DTS { get; set; }

        public int StatusID { get; set; }

        [ForeignKey(nameof(StatusID))]
        public ResultStatus Status { get; set; }

        public int TimeMS { get; set; }
    }
}