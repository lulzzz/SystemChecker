﻿using AutoMapper;
using SystemChecker.Model.DTO;
using SystemChecker.Model.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SystemChecker.Model.Data
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<CheckScheduleDTO, CheckSchedule>().ReverseMap();
            CreateMap<CheckDataDTO, CheckData>().ReverseMap();
            CreateMap<CheckDetailDTO, Check>()
                .ForMember(d => d.Schedules, o => o.UseDestinationValue())
                .ReverseMap();
            CreateMap<CheckDTO, Check>().ReverseMap();
            CreateMap<CheckTypeDTO, CheckType>().ReverseMap();
            CreateMap<CheckTypeOptionDTO, CheckTypeOption>().ReverseMap();
            CreateMap<ConnStringDTO, ConnString>().ReverseMap();
            CreateMap<LoginDTO, Login>().ReverseMap();
        }
    }
}
