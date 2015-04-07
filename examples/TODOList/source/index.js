var logger = require('./source/managers/logger.js');
var pageManager = require('./source/managers/page.js');

// name for states
var LIST_STATE = 'list';
var CREATE_STATE = 'create';
var DETAILS_STATE = 'details';
var LOGIN_STATE = 'login';
var LOGOUT_STATE = 'logout';

// middleware
var checkAuthorization = require();
var dataprovider = require();
var authorizeMe = require();
var logout = require();

// states & flows description
var stateflow = require('../../bin/stateflow.min.js').create(); // create singleton if we need it
var flow = stateflow.flow;
var state = stateflow.state;

state(LIST_STATE).attach(pageManager.showListPage, pageManager).attach(logger);
state(CREATE_STATE).attach(pageManager.showCreatePage, pageManager).attach(logger);
state(DETAILS_STATE).attach(pageManager.showDetailsPage, pageManager).attach(logger);
state(LOGIN_STATE).attach(pageManager.showLoginPage, pageManager).attach(logger);
state(LOGOUT_STATE).attach(pageManager.showLoginPage, pageManager).attach(logger);

//except state.on you can use state.detach and state.once
//for example state.off([LIST_STATE], [callback], [context]);
//for example state.off(DETAILS_STATE, callback, [context]);

flow.to(LIST_STATE)
    .process(checkAuthorization)
    .error(authorizeMe)
    .process(dataprovider.getList, dataprovider)
    .described();

flow.to(CREATE_STATE)
    .process(checkAuthorization)
    .error(authorizeMe)
    .described();

flow.to(DETAILS_STATE)
    .process(checkAuthorization)
    .error(authorizeMe)
    .process(dataprovider.getDetails, dataprovider)
    .described();

// you don't need describe flow for next states:
// flow.to(LOGIN_STATE)
//    .described();
//
flow.to(LOGOUT_STATE)
    .process(logout)
    .described();

// set state for application
state.set(LIST_STATE);