﻿using AutoMapper;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using SystemChecker.Model.Data;
using SystemChecker.Model.Data.Entities;
using SystemChecker.Model.Data.Interfaces;
using SystemChecker.Model.DTO;
using SystemChecker.Model.Hubs;
using SystemChecker.Model.Loggers;
using SystemChecker.Model.Notifiers;

namespace SystemChecker.Model.Helpers
{
    public interface ICheckerHelper
    {
        Task<ISettings> GetSettings();
        Task SaveResult(CheckResult result);
        Task RunSubChecks(Check check, ICheckLogger logger, Action<SubCheck> action);
        Task RunNotifiers(Check check, CheckResult result, ISettings settings, ICheckLogger logger);
        Task<Check> GetDetails(int value);
    }
    public class CheckerHelper : ICheckerHelper
    {
        private readonly IRepository<SubCheckType> _subCheckTypes;
        private readonly IRepository<CheckResult> _checkResults;
        private readonly ICheckRepository _checks;
        private readonly ISettingsHelper _settingsHelper;
        private readonly IHubContext<DashboardHub> _dashboardHub;
        private readonly IHubContext<DetailsHub> _detailsHub;
        private readonly IHubContext<CheckHub> _checkHub;
        private readonly IServiceProvider _serviceProvider;
        public CheckerHelper(IRepository<SubCheckType> subCheckTypes, IRepository<CheckResult> checkResults, ICheckRepository checks, IMapper mapper, ISettingsHelper settingsHelper, IHubContext<DashboardHub> dashboardHub,
            IHubContext<DetailsHub> detailsHub, IHubContext<CheckHub> checkHub, IServiceProvider serviceProvider)
        {
            _subCheckTypes = subCheckTypes;
            _checkResults = checkResults;
            _checks = checks;
            _settingsHelper = settingsHelper;
            _dashboardHub = dashboardHub;
            _detailsHub = detailsHub;
            _checkHub = checkHub;
            _serviceProvider = serviceProvider;
        }

        public async Task<ISettings> GetSettings()
        {
            return await _settingsHelper.Get();
        }

        public async Task RunSubChecks(Check check, ICheckLogger logger, Action<SubCheck> action)
        {
            var types = await _subCheckTypes.GetAll().Where(x => x.CheckTypeID == check.TypeID).ToListAsync();
            var subChecks = check.SubChecks.Where(x => x.Active);
            foreach (var subCheck in subChecks)
            {
                var type = types.FirstOrDefault(x => x.ID == subCheck.TypeID) ?? throw new Exception($"Invalid type {subCheck.TypeID}");
                logger.Info($"Running {type.Name} sub-check");
                action(subCheck);
            }
        }

        public async Task SaveResult(CheckResult result)
        {
            await _checkResults.Add(result);
            await _dashboardHub.Clients.All.InvokeAsync("check", result.CheckID);
            await _detailsHub.Clients.All.InvokeAsync("check", result.CheckID);
            await _checkHub.Clients.All.InvokeAsync("check", result.CheckID);
        }

        public async Task RunNotifiers(Check check, CheckResult result, ISettings settings, ICheckLogger logger)
        {
            var notifications = check.Notifications.Where(x => x.Active);
            if (!notifications.Any())
            {
                logger.Info("No active notifications configured");
                return;
            }
            logger.Info("Running notifiers");
            foreach (var notification in notifications)
            {
                if (!Enum.IsDefined(typeof(Enums.CheckNotificationType), notification.TypeID))
                {
                    logger.Warn($"Unknown notification type: {notification.TypeID} - ignoring");
                    continue;
                }
                var notifier = GetNotifier((Enums.CheckNotificationType)notification.TypeID);
                await notifier.Run(check, notification, result, settings, logger);
            }
        }

        private BaseNotifier GetNotifier(Enums.CheckNotificationType notificationType)
        {
            Type type;
            switch (notificationType)
            {
                case Enums.CheckNotificationType.Slack:
                    type = typeof(SlackNotifier);
                    break;
                case Enums.CheckNotificationType.Email:
                    type = typeof(EmailNotifier);
                    break;
                case Enums.CheckNotificationType.SMS:
                    type = typeof(SMSNotifier);
                    break;
                default:
                    throw new Exception($"Invalid notification type: {notificationType}");
            }
            return _serviceProvider.GetService(type) as BaseNotifier;
        }

        public async Task<Check> GetDetails(int checkID)
        {
            return await _checks.GetDetails(checkID);
        }
    }
}