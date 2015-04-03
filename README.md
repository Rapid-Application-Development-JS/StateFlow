#StateFlow

> Tries to describe the business logic flow of your application

This is a small and lightweight (7 KB) tool (*logic glue*) for **logic chains and switching** based on the middleware idea.

```javascript
flow.to('a')
           .process(middleware1)
           .error(middleware2)
           .error(middleware3)
           .process(middleware4)
           .error(middleware6)
           .process(middleware7)
           .described();

flow.to('b')
    .process(middleware)
    .described();
               
flow.switchTo('a', params);
```

##Idea
If we examine the structure of your application, it will most likely be like this:

![Directed acyclic graph](assets/dag.png)
 
This means the structure of a [directed acyclic graph](http://en.wikipedia.org/wiki/Directed_acyclic_graph), and its nodes will contain the states of your application. Arrows will denote transactions of transitions between application states; [transaction](http://en.wikipedia.org/wiki/Transaction_processing) is understood as a sequence of operations required for transition to the subsequent application state.

> Take notice that currently the rollback mechanism is absent for [Atomicity](http://en.wikipedia.org/wiki/Transaction_processing#Atomicity) in a sequence of operations. Rollback is provided by the absence of state preservation during the execution of a logic chain. But further we are going to provide additional rollback API for every operation in transaction.

As a rule, every application state is described through the following three constituents: state name (for convenience), sequence of operations for trasition to the current state (transaction), and parameters of transaction launch.

For example, the description of `flow` for transition to the state of displaying a screen with details, may be as follows:

```javascript
// one of possible ways to describe middleware
function showUserScreen(data, chain) {
	chain.switchTo('permission_screen', param);
}

// we describe the simplest transition transaction with an option of halt and transition to another state
flow.to('details_screen')
    .process(checkUserRole)
    .error(showUserScreen)
    .process(showDetails)
    .described();
    
// when we need to move to the state 'details_screen', we execute:
flow.switchTo('details_screen', params);

// or if we need to stop the current transaction inside middleware, and start a new one, then:
chain.switchTo('permission_screen', param);
```
> `checkAuthorization`, `showLogin`, `showDetails` and `showDetails` are actually a challenge for **middleware**. They can be implemented by any means. (see [middleware API](#middleware)).
> 
> Although in our case the notion **middleware** is very similar to the notion **[monad](http://en.wikipedia.org/wiki/Monad_(functional_programming))**, we will use **middleware** further on, because we can set an execution context for an operation. For this reason, they may have some side effect, and it is necessary to monitor further.

##Advantages
- An option of launching a sequence of operations for transition to a state by simply changing it.
- An option of launching a sequence of operations manually. 
- The application structure is described with transactions of transitions between application states. Each transaction consists of operations. Each operation is implemented via calling **middleware**.
- A transaction may be interrupted and redirected. 
- In contrast to standard approaches of describing operation sequences, there are three ways to end an operation: `next`, `error` and `switchTo`. This allows to easily describe the application structure with an option of routing. 
- An option of setting an execution context for **middleware**.

## Dependencies

None. You can use it on both the client and the server sides.

##Documentation

###<a name="middleware"></a>Middleware API
Any callback function can serve as **middleware** if it takes `data` (any javascript object) and `chain` ([flow handler object](#flow_handler)) as parameters:

```javascript
function middleware(data, chain) {
	// your code
	// ..
	chain.next(newData);
}
```
Since operations in a transaction can be asynchronous, after the execution of your code you must call [`chain.next(newData);`](#handler_next) or [`chain.error(errorData);`](#handler_error) or [`chain.switchTo(newState, newData);`](#handler_switch) for transition to the subsequent step, error processing, or switching to another state respectively.
> In case of need you may set an execution context for **middleware** (see [process/do](#process_do))

###Atomicity
It is recommended for every **middleware** in the transaction to represent an independent operation, which operates input data and returns new data for the subsequent operation or error processing.
 
###Interruption
Since we cannot block the execution of an asynchronous operation in the general case, by interruption of a transaction, for example, during a change of a state from the outside or by execution of `run`, the operation *that will be executed* (not the current one) will be blocked. This means that the interruption occurs during the use of [flow handler object](#flow_handler).

For example:

```javascript
function middleware(data, chain) {
    // the code written here will be executed -->
    ...
    // <--
    setTimeout(function () { // async data flow
        // the code written here will be executed -->
        ...
        // <--
        chain.next(data); // but the data will not be transmitted because the transaction has been interrupted, and the subsequent operations will not be launched
    }, delay);
}
```
After the interruption of a transition to any state, and after the launch of a transition attempt, the sequence of operations in the transaction will start with the first operation.  и после этого запуска попытки перехода в него же последовательность операций в транзакции начнется с первой операции. **You cannot resume a transaction from an interrupted operation.**

> Pay attention to the launch of a transaction with [run](#run), since transactions are transitions between states, and there can be only one state in the application - any other transaction currently happening would be interrupted, while the application will shift to the state, for which the transaction was launched.

###Flow
An object created with:

```javascript
var Flow = require("path/stateflow.min.js");
var flow = new Flow();
```
will actually be a *builder* for describing states with an option of switching to a described state.
  
####to
the method registers a state using the transmitted name and returns the object [transaction](#transaction) for further describing of the sequence of operations.

####switchTo
the method switches to an indicated state and transmits the object of the parameters to the transaction.

```javascript
flow.switchTo('new_state', param)
```
####example
```javascript
// flow description
flow.to('a')
           .process(middleware1)
           .error(middleware2)
           .process(middleware3)
           .described();
  
// flow switching            
flow.switchTo('a', params);
```

###<a name="transaction"></a>Transaction(Pipe)
The object that allows (with the help of its methods) to describe a transaction that consists of a sequence of operations and error processing.

####<a name="process_do"></a>process/do
Registers **middleware** as an operation; the execution context of **middleware** can be transmitted as the second, optional parameter.

```javascript
var transaction = flow.to('a');
transaction.process(middleware, [context]);
```
Returns the object of the transaction, to which the operation is registered; thus a registration chain can be easily constructed.
> `do` is just an alias for `process` and it is designed for convenience of reading the logical chain of operations. 

####<a name="error"></a>error
Registers **middleware** as an operation of error processing; the execution context can be transmitted as the second, optional parameter. Returns the object of the transaction, to which the operation is registered. **middleware**.

```javascript
var transaction = flow.to('a');
transaction.error(middleware, [context]);
```
When in any operation you call a method [error](#handler_error) from **middleware**, notifying of an error, during all the subsequent operations until the first registered processor, errors will be ignored and the transaction will come to this processor (operation).

Inside the operation of error processing you may also use [`chain.next(newData);`](#handler_next), and [`chain.error(errorData);`](#handler_error), and [`chain.switchTo(newState, newData);`](#handler_switch). In this case the transaction will continue the execution: this means, by moving to the subsequent operation, or the error processor, or by launching a new transaction, respectively.

For example, while describing flow in the following way:

```javascript
flow.to('a')
           .process(middleware1)
           .error(middleware2)
           .error(middleware3)
           .process(middleware4)
           .process(middleware5)
           .error(middleware6)
           .process(middleware7)
           .described();
```
If an error occurs in *middleware1*, the sequence will move to *middleware2*, then if it is processed and `next` is called, to *middleware4*, then if `error` is called, to *middleware6*. The step *middleware5* will be skipped, as described above. Finally, in *middleware6* you may change the state using `switchTo` or move on to the last operation *middleware7* if `next` is called.

####switchTo
Switches the appliacation state, which means it launches a new transition transaction, while the current one will be interrupted. As its parameters, it takes the state name and input parameters for the sequence of operations.

```javascript
flow.to('a')
    .process(middleware)
    .switchTo('b')
    .error(middleware)
    .process(middleware)
    .described('b');

flow.to('b')
    .process(middleware)
    .described();

flow.switchTo('a', params);
```

> Currently this method is under development, but you can already use it fully-featured equivalent based on [flow handler `switchTo`](#handler_switch):

```javascript
function switcher(data, chain) {
    chain.switchTo('new_state', data);
}

//..
    .process(switcher)
//..
```

####after
Registers an operation that will be executed as the last one in the transaction of the state change in two cases:

- switch to another state
- end of the switch transaction.

```javascript
flow.to('a')
           .process(middleware1)
           .error(middleware2)
           .process(middleware3)
           .after(middleware4)
           .described();
```

####described
Finalizes the description of the transaction and enables its further use. Without calling `.described()`, the state is not considered as described, and you cannot switch to it. Afterwards it is impossible to add operations to the sequence of description.

If the state name is transmitted to `.described([state_name])`, then after the execution of the current transaction a switch to a new state will be launched, and the data will be transmitted:

```javascript
flow.to('a')
    .process(middleware)
    .process(middleware)
    .process(middleware)
    .described('b');

flow.to('b')
    .process(middleware)
    .described();

flow.switchTo('a', params);
```

####<a name="run"></a>run
Enables manual transactions of switching to a state:

```javascript
var transaction = flow.to('a')
    .process(middlewareA)
    .process(middlewareB)
    .described();

transaction.run(params);
```
 
###<a name="flow_handler"></a>FlowHandler(Chain)
An auxiliary object that is transmitted by the second parameter to [middleware](#middleware), which allows to control the sequence of operations inside **middleware**

####getCurrentState
Allows to get the current state of the application inside **middleware**

```javascript
var state = chain.getCurrentState();
```
This method can be used for [transition through states with conditions](#transition_example).
 
####<a name="handler_next"></a>next
Switches the execution to the subsequent operation in the transaction by trasmitting data to it:

```javascript
chain.next(data);
```
It must be the last operation in the middleware flow.

####<a name="handler_error"></a>error
Notifies the flow of an error and delegates control to **[the first subsequent error processor](#error)**, by trasmitting data to it:

```javascript
chain.error(data);
```

It must be the last operation in the middleware flow.

####<a name="handler_switch"></a>switchTo
Interrupts the execution of the current operation flow and launches a new one:

```javascript
chain.switchTo(newState, params);
```

It must be the last operation in the middleware flow.

##Example
Let's make an example of a description of a transit flow (from *test.js*):
>You may see more examples in the tests folder
<a name="transition_example"></a>

```javascript
        var isAuthorized = false;

        var checkAuthorization = function (data, chain) {
            data.flow += '_check';
            if (!isAuthorized) {
                chain.switchTo('login', {
                    state: chain.getCurrentState(),
                    param: data
                })
            } else {
                chain.next(data);
            }
        };

        var showRequredScreen = function (data, chain) {
            if (data) {
                chain.switchTo(data.state, data.param)
            } else {
                chain.switchTo('home');
            }
        };

        var middleware = function (data, chain) {
            data.flow += '_middleware';
            chain.next(data);
        };

        // describe flow for 'login' state
        flow.to('login')
            .process(function (data, chain) {
                isAuthorized = true;

                data.param.flow += '_authorization';
                chain.next(data);
            })
            .process(showRequredScreen)
            .described();

        // describe flow for 'user' state
        flow.to('user')
            .process(checkAuthorization)
            .process(middleware)
            .process(function (data, chain) {
                (data).should.equal('_check_authorization_check_middleware');
                done();
            })
            .described();

        // try to switch to 'user' state with id=123, 'flow' attribute only for testing
        flow.switchTo('user', {id: 123, flow: ''})
```
When we try to move to the `user` state, `checkAuthorization` is registered as our first operation; in case a user is not registered, we save our state and its login parameters as parameters for transition to the `login` state, execute all operations for login, and restore the transition to the `user` state with previous parameters.
The order of operations is as follows in this case: **check -> authorization -> check -> middleware**
> Take notice that during the description of **middleware** for login `flow` you will have to manually forward the transition parameters through all operations.

##Roadmap
Currently we are considering the opportunities of expanding the functionality in the following directions:

- Subflows which can be included as parts of other transactions

```javascript
flow.new('subflow')
    .process(middleware)
    // ...
    .described();
    
flow.to('a')
    .process('subflow')
    .process(middleware1)
    .error(middleware2)
    .process(middleware3)
    .described();
    
flow.to('b')
    .process(middleware4)
    .error('subflow')
    .after(middleware5)
    .described();
```

- An option of setting multiple parallel operations for `process` and `do`.
- Rollback API for **middleware**.
- Logging
- An option of using routing URL as a state name (for front-end and node.js), automatic transmission of URL parameters as transaction parameters. For example, `sequencer.pipe('/users/:id/)` will launch a transaction of transition to this state with `id` as a transaction parameter. *At this point you can simply change the state from an external router.*
- Embedded states, which are described via `state.substate`.

```javascript
// root state
var userFlow = flow.to('/users/:id/)
    .process(checkAuthorization)
    .error(showLogin)
    .process(showUserScreen)
    .described();

// substate 
userFlow.to('/purchase/:id')
    //...
    .described();

// other substate 
userFlow.to('/history')
    //...
    .described();
```
> Currently we consider opportunity and necessity. During the implementation, the API of the functional features mentioned in **Roadmap** is most likely to be changed. 