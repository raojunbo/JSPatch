// JS端通过定义一套DSL语言，DSL语言明确了如何定义和执行OC的语言要素(定义类，执行方法，调用其他API等)
// 定义新的类并覆写方法

defineClass('JPViewController', {
    // 在JPViewController里重写方法handleBtn
  handleBtn: function(sender) {
    // JPTableViewController.__c("alloc")().__c("init")()
    // 全局对象JPTableViewController
    // __c js定义的通过方法名调用函数
    var tableViewCtrl = JPTableViewController.alloc().init()
    //  self.__c("navigationController")().__c("pushViewController_animated")(tableViewCtrl, YES)
    self.navigationController().pushViewController_animated(tableViewCtrl, YES)
  }
})
// 定义新的类 defineClass('JPTableViewController : UITableViewController <UIAlertViewDelegate>', ['data'], {...})
// defineClass("类名：父类<协议>", [属性],{方法名：方法体})
defineClass('JPTableViewController : UITableViewController <UIAlertViewDelegate>', ['data'], {
  dataSource: function() {
    var data = self.data();
    if (data) return data;
    var data = [];
    for (var i = 0; i < 20; i ++) {
      data.push("cell from js " + i);
    }
    self.setData(data)
    return data;
  },
  numberOfSectionsInTableView: function(tableView) {
    return 1;
  },
  tableView_numberOfRowsInSection: function(tableView, section) {
    return self.dataSource().length;
  },
  tableView_cellForRowAtIndexPath: function(tableView, indexPath) {
    var cell = tableView.dequeueReusableCellWithIdentifier("cell") 
    if (!cell) {
      cell = require('UITableViewCell').alloc().initWithStyle_reuseIdentifier(0, "cell")
    }
    cell.textLabel().setText(self.dataSource()[indexPath.row()])
    return cell
  },
  tableView_heightForRowAtIndexPath: function(tableView, indexPath) {
    return 60
  },
  tableView_didSelectRowAtIndexPath: function(tableView, indexPath) {
     var alertView = require('UIAlertView').alloc().initWithTitle_message_delegate_cancelButtonTitle_otherButtonTitles("Alert",self.dataSource()[indexPath.row()], self, "OK",  null);
     alertView.show()
  },
  alertView_willDismissWithButtonIndex: function(alertView, idx) {
    console.log('click btn ' + alertView.buttonTitleAtIndex(idx).toJS())
  }
})




